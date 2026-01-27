/**
 * App Component
 * Interfaz principal de ColorManager
 * Estilo: Clean Industrial (SPEC-UX-UI)
 * 
 * ID Intervención: IMPL-20260127-06 (Tipado seguro + Toasts + Modales)
 * FIX REFERENCE: FIX-20260127-03 - Eliminado import de electron.d.ts (tipos globales no se importan)
 * @see /src/renderer/types/electron.d.ts para interfaz Window.colorManager
 */

// Nota: Los tipos de electron.d.ts son globales (declare global) y se cargan automáticamente via tsconfig
import { useState, useEffect } from "react"
import { PesoEvent, RecetaSayer } from "@shared/types"
import { ToastProvider } from "./hooks/useToast" // FIX-20260127-03: extensión cambiada a .tsx
import { ModalProvider } from "./components/ui/Modal"
import Toast from "./components/ui/Toast"
import ScaleDisplay from "./components/ScaleDisplay"
import HeaderBar from "./components/HeaderBar"
import RecetaViewer from "./components/RecetaViewer"
import SessionController from "./components/SessionController"
import HistoryView from "./components/HistoryView"
import InventoryView from "./components/InventoryView"

export default function App() {
  const [pesoActual, setPesoActual] = useState(0)
  const [basculaConectada, setBasculaConectada] = useState(false)
  const [mezclando, setMezclando] = useState(false)
  const [recetaDetectada, setRecetaDetectada] = useState<RecetaSayer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sesionMezcla, setSesionMezcla] = useState(false)
  const [vista, setVista] = useState<"home" | "mezcla" | "historial" | "inventario">("home") // Sistema de vistas

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

    window.colorManager.onError((error: Error | string) => {
      console.error("[App] Error del sistema:", error)
      const message = typeof error === "string" ? error : error.message || "Error desconocido"
      setError(message)
    })
  }, [])

  const handleIniciarMezcla = async () => {
    if (!recetaDetectada) {
      console.warn("[App] No hay receta detectada para iniciar mezcla")
      return
    }
    try {
      await window.colorManager.iniciarMezcla("RECETA-" + recetaDetectada.numero)
      setMezclando(true)
      setSesionMezcla(true)
      setVista("mezcla")
    } catch (error) {
      console.error("Error iniciando mezcla:", error)
    }
  }

  const handleFinalizarMezcla = async () => {
    try {
      await window.colorManager.cancelarMezcla()
      setSesionMezcla(false) // Volver a la pantalla principal
      setMezclando(false)
      setRecetaDetectada(null) // Limpiar receta
      setVista("home") // Volver a vista home
    } catch (error) {
      console.error("Error finalizando mezcla:", error)
    }
  }

  return (
    <ModalProvider>
      <ToastProvider>
        <div className="min-h-screen bg-cm-bg flex flex-col">
          <Toast />
          {/* Vista: Inventario */}
          {vista === "inventario" && (
            <InventoryView onBack={() => setVista("home")} />
          )}

          {/* Vista: Historial */}
          {vista === "historial" && (
            <HistoryView onBack={() => setVista("home")} />
          )}

          {/* Vista: Mezcla */}
          {vista === "mezcla" && sesionMezcla && recetaDetectada && (
            <SessionController
              receta={recetaDetectada}
              onFinish={handleFinalizarMezcla}
            />
          )}

          {/* Vista: Home */}
          {vista === "home" && (
            <>
              {/* Header */}
              <HeaderBar 
                basculaConectada={basculaConectada}
                onHistorialClick={() => setVista("historial")}
                onInventarioClick={() => setVista("inventario")}
              />

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
                  <div className="w-full max-w-4xl">
                    <RecetaViewer
                      receta={recetaDetectada}
                      onDismiss={() => setRecetaDetectada(null)}
                    />
                    {/* Botón para Iniciar Mezcla - Added after RecetaViewer */}
                    <div className="mt-4 flex gap-4 justify-center">
                      <button
                        onClick={handleIniciarMezcla}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl"
                      >
                        ▶ Iniciar Mezcla
                      </button>
                    </div>
                  </div>
                )}

                {/* Welcome Message */}
                {!recetaDetectada && (
                  <div className="text-center">
                    <h1 className="text-5xl font-bold text-cm-text mb-2">
                      Hola ColorManager
                    </h1>
                    <p className="text-lg text-cm-text-secondary">
                      Auditor de Mezclas - Control de Producción
                    </p>
                  </div>
                )}

                {/* Scale Status */}
                {!recetaDetectada && (
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
                )}

                {/* Weight Display */}
                {!recetaDetectada && (
                  <ScaleDisplay pesoActual={pesoActual} mezclando={mezclando} />
                )}

                {/* Info Box */}
                {!recetaDetectada && (
                  <div className="w-full max-w-2xl bg-cm-surface border border-cm-border rounded-lg p-6">
                    <h3 className="font-bold text-cm-text mb-4">ℹ️ Información del Sistema</h3>
                    <ul className="space-y-2 text-sm text-cm-text-secondary font-mono-numbers">
                      <li>• Peso actual: <span className="text-cm-text font-bold">{pesoActual.toFixed(1)}g</span></li>
                      <li>• Estado báscula: <span className="text-cm-text font-bold">{basculaConectada ? "OK" : "ERROR"}</span></li>
                      <li>• Modo: <span className="text-cm-text font-bold">{mezclando ? "MEZCLA ACTIVA" : "ESPERA"}</span></li>
                      <li>• Recetas detectadas: <span className="text-cm-text font-bold">{recetaDetectada ? "1" : "0"}</span></li>
                      <li>• Build: IMPL-20260127-06</li>
                    </ul>
                  </div>
                )}
              </main>

              {/* Footer */}
              <footer className="bg-cm-surface border-t border-cm-border p-4 text-center text-sm text-cm-text-secondary">
                <p>ColorManager v0.0.1 - Sistema de Auditoría de Mezclas Automotrices</p>
              </footer>
            </>
          )}
        </div>
      </ToastProvider>
    </ModalProvider>
  )
}
