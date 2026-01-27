/**
 * HistoryView Component
 * Tabla de historial de mezclas finalizadas
 * Con badges "Perfecto" (verde) y "Desviado" (naranja) según la tolerancia
 * 
 * Estilo: Tabla zebra con bordes sutiles, Tailwind
 * ID Intervención: IMPL-20260127-05
 * @see SPEC-UX-COLORMANAGER.md
 */

import { useState, useEffect } from "react"
import { RegistroMezcla } from "@shared/types"
import HeaderBar from "./HeaderBar"

interface HistoryViewProps {
  onBack: () => void
}

export default function HistoryView({ onBack }: HistoryViewProps) {
  const [historial, setHistorial] = useState<RegistroMezcla[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarHistorial()
  }, [])

  const cargarHistorial = async () => {
    try {
      setCargando(true)
      if (!window.colorManager) {
        setError("colorManager no disponible")
        return
      }
      const datos = await window.colorManager.obtenerHistorial()
      setHistorial(datos.reverse()) // Mostrar más recientes primero
      setError(null)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido"
      setError(mensaje)
      console.error("[HistoryView] Error:", err)
    } finally {
      setCargando(false)
    }
  }

  const obtenerBadge = (registro: RegistroMezcla) => {
    const esPerfecto = Math.abs(registro.diferencia) <= registro.tolerancia
    return esPerfecto
      ? { texto: "Perfecto", color: "bg-green-100 text-green-800 border-green-300" }
      : { texto: "Desviado", color: "bg-orange-100 text-orange-800 border-orange-300" }
  }

  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO)
    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const formatearHora = (horaISO: string) => {
    const fecha = new Date(horaISO)
    return fecha.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-cm-bg flex flex-col">
      {/* Header */}
      <HeaderBar basculaConectada={true} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 p-8">
        {/* Título y botón volver */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-cm-text">Historial de Mezclas</h2>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            ← Volver
          </button>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="text-center py-12">
            <p className="text-lg text-cm-text-secondary">Cargando historial...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Tabla de Historial */}
        {!cargando && !error && (
          <>
            {historial.length === 0 ? (
              <div className="text-center py-12 bg-cm-surface border border-cm-border rounded-lg">
                <p className="text-lg text-cm-text-secondary">Sin mezclas registradas</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto bg-cm-surface border border-cm-border rounded-lg shadow-sm">
                <table className="w-full text-sm">
                  {/* Encabezados */}
                  <thead className="bg-cm-bg border-b border-cm-border">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-cm-text">Fecha</th>
                      <th className="px-6 py-3 text-left font-semibold text-cm-text">Hora Inicio</th>
                      <th className="px-6 py-3 text-left font-semibold text-cm-text">Receta</th>
                      <th className="px-6 py-3 text-center font-semibold text-cm-text">Peso Total (g)</th>
                      <th className="px-6 py-3 text-center font-semibold text-cm-text">Peso Final (g)</th>
                      <th className="px-6 py-3 text-center font-semibold text-cm-text">Diferencia</th>
                      <th className="px-6 py-3 text-center font-semibold text-cm-text">Estado</th>
                    </tr>
                  </thead>

                  {/* Cuerpo de la tabla */}
                  <tbody>
                    {historial.map((registro, idx) => {
                      const badge = obtenerBadge(registro)
                      const esParidad = idx % 2 === 0
                      return (
                        <tr
                          key={registro.id}
                          className={`border-b border-cm-border transition-colors ${
                            esParidad ? "bg-cm-surface" : "bg-cm-bg"
                          } hover:bg-blue-50`}
                        >
                          <td className="px-6 py-3 text-cm-text font-medium">
                            {formatearFecha(registro.fecha)}
                          </td>
                          <td className="px-6 py-3 text-cm-text">
                            {formatearHora(registro.horaInicio)}
                          </td>
                          <td className="px-6 py-3 text-cm-text font-mono">
                            {registro.recetaId}
                          </td>
                          <td className="px-6 py-3 text-center text-cm-text font-medium">
                            {registro.pesoTotal.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-center text-cm-text font-medium">
                            {registro.pesoFinal.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span
                              className={`font-bold ${
                                Math.abs(registro.diferencia) <= registro.tolerancia
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {registro.diferencia > 0 ? "+" : ""}{registro.diferencia.toFixed(2)}g
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-full border font-semibold text-xs ${badge.color}`}
                            >
                              {badge.texto}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Resumen */}
            {historial.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mt-6">
                <div className="bg-cm-surface border border-cm-border rounded-lg p-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase mb-1">
                    Total Mezclas
                  </p>
                  <p className="text-2xl font-bold text-cm-text">{historial.length}</p>
                </div>

                <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">
                    Perfectas
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {historial.filter((r) => Math.abs(r.diferencia) <= r.tolerancia).length}
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-orange-700 uppercase mb-1">
                    Desviadas
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {historial.filter((r) => Math.abs(r.diferencia) > r.tolerancia).length}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                    Peso Promedio
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(historial.reduce((sum, r) => sum + r.pesoFinal, 0) / historial.length).toFixed(1)}g
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-cm-surface border-t border-cm-border p-4 text-center text-sm text-cm-text-secondary">
        <p>ColorManager v0.0.1 - Historial de Mezclas | Build: IMPL-20260127-05</p>
      </footer>
    </div>
  )
}
