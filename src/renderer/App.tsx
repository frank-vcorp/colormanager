/**
 * App Component
 * Interfaz principal de ColorManager
 * Estilo: Clean Industrial (SPEC-UX-UI)
 * 
 * ID Intervención: IMPL-20260127-03
 */

import { useState, useEffect } from "react"
import { PesoEvent, RecetaSayer } from "@shared/types"
import ScaleDisplay from "./components/ScaleDisplay"
import HeaderBar from "./components/HeaderBar"
import RecetaViewer from "./components/RecetaViewer"

declare global {
  interface Window {
    colorManager: {
      onPesoActualizado: (cb: (evento: PesoEvent) => void) => void
      onRecetaDetectada: (cb: (receta: RecetaSayer) => void) => void
      onEstadoBascula: (cb: (estado: { conectada: boolean; peso: number }) => void) => void
      onError: (cb: (error: any) => void) => void
      iniciarMezcla: (recetaId: string) => Promise<any>
      cancelarMezcla: () => Promise<any>
    }
  }
}

export default function App() {
  const [pesoActual, setPesoActual] = useState(0)
  const [basculaConectada, setBasculaConectada] = useState(false)
  const [mezclando, setMezclando] = useState(false)
  const [recetaDetectada, setRecetaDetectada] = useState<RecetaSayer | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Listeners para cambios de peso y recetas
  useEffect(() => {
    if (!window.colorManager) return

    window.colorManager.onPesoActualizado((evento: PesoEvent) => {
      setPesoActual(evento.peso)
    })

    window.colorManager.onEstadoBascula((estado) => {
      setBasculaConectada(estado.conectada)
    })

    window.colorManager.onRecetaDetectada((receta: RecetaSayer) => {
      console.log("[App] Receta detectada:", receta)
      setRecetaDetectada(receta)
      setError(null)
    })

    window.colorManager.onError((error: any) => {
      console.error("[App] Error del sistema:", error)
      const message = typeof error === "string" ? error : error?.message || "Error desconocido"
      setError(message)
    })
  }, [])

  const handleIniciarMezcla = async () => {
    try {
      await window.colorManager.iniciarMezcla("RECETA-001")
      setMezclando(true)
    } catch (error) {
      console.error("Error iniciando mezcla:", error)
    }
  }

  const handleCancelarMezcla = async () => {
    try {
      await window.colorManager.cancelarMezcla()
      setMezclando(false)
    } catch (error) {
      console.error("Error cancelando mezcla:", error)
    }
  }

  return (
    <div className="min-h-screen bg-cm-bg flex flex-col">
      {/* Header */}
      <HeaderBar basculaConectada={basculaConectada} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        {/* Error Message */}
        {error && (
          <div className="w-full max-w-2xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Receta Detectada Alert */}
        {recetaDetectada && (
          <RecetaViewer
            receta={recetaDetectada}
            onDismiss={() => setRecetaDetectada(null)}
          />
        )}

        {/* Welcome Message */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-cm-text mb-2">
            Hola ColorManager
          </h1>
          <p className="text-lg text-cm-text-secondary">
            Auditor de Mezclas - Control de Producción
          </p>
        </div>

        {/* Scale Status */}
        <div className={`p-6 rounded-lg border-2 ${
          basculaConectada
            ? "border-cm-success bg-green-50"
            : "border-cm-danger bg-red-50"
        }`}>
          <p className="text-center text-cm-text-secondary mb-2">
            Estado de Báscula
          </p>
          <p className={`text-center font-bold ${
            basculaConectada ? "text-cm-success" : "text-cm-danger"
          }`}>
            {basculaConectada ? "✓ Conectada (Simulación)" : "✗ No conectada"}
          </p>
        </div>

        {/* Weight Display */}
        <ScaleDisplay pesoActual={pesoActual} mezclando={mezclando} />

        {/* Control Buttons */}
        <div className="flex gap-4">
          {!mezclando ? (
            <button
              onClick={handleIniciarMezcla}
              className="button-primary px-8 py-3 text-lg"
            >
              Iniciar Mezcla
            </button>
          ) : (
            <button
              onClick={handleCancelarMezcla}
              className="bg-cm-danger text-white px-8 py-3 rounded font-medium hover:opacity-90 text-lg"
            >
              Cancelar Mezcla
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="w-full max-w-2xl bg-cm-surface border border-cm-border rounded-lg p-6">
          <h3 className="font-bold text-cm-text mb-4">ℹ️ Información del Sistema</h3>
          <ul className="space-y-2 text-sm text-cm-text-secondary font-mono-numbers">
            <li>• Peso actual: <span className="text-cm-text font-bold">{pesoActual.toFixed(1)}g</span></li>
            <li>• Estado báscula: <span className="text-cm-text font-bold">{basculaConectada ? "OK" : "ERROR"}</span></li>
            <li>• Modo: <span className="text-cm-text font-bold">{mezclando ? "MEZCLA ACTIVA" : "ESPERA"}</span></li>
            <li>• Recetas detectadas: <span className="text-cm-text font-bold">{recetaDetectada ? "1" : "0"}</span></li>
            <li>• Build: IMPL-20260127-03</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-cm-surface border-t border-cm-border p-4 text-center text-sm text-cm-text-secondary">
        <p>ColorManager v0.0.1 - Sistema de Auditoría de Mezclas Automotrices</p>
      </footer>
    </div>
  )
}
