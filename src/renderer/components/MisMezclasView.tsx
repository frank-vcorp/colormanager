/**
 * MisMezclasView Component
 * Vista de mezclas del entonador - últimos 7 días
 * 
 * ID Intervención: ARCH-20260130-01
 * 
 * Funcionalidades:
 * - Ver mezclas realizadas (sin precios)
 * - Reimprimir etiqueta
 * - Repetir mezcla (cargar receta)
 */

import { useState, useEffect } from "react"
import { RegistroMezcla } from "@shared/types"
import HeaderBar from "./HeaderBar"
import MixDetailsModal from "./MixDetailsModal"

interface MisMezclasViewProps {
  onBack: () => void
  onRepetirMezcla: (mezcla: RegistroMezcla) => void
}

export default function MisMezclasView({ onBack, onRepetirMezcla }: MisMezclasViewProps) {
  const [mezclas, setMezclas] = useState<RegistroMezcla[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMezcla, setSelectedMezcla] = useState<RegistroMezcla | null>(null)

  useEffect(() => {
    cargarMezclas()
  }, [])

  const cargarMezclas = async () => {
    try {
      setCargando(true)
      setError(null)
      // Cargar mezclas sin filtrar por operador (todas las del período)
      // Cargar mezclas sin filtrar por operador (todas las del período)
      // FIX-DIAGNOSTIC: Ampliar a 30 días y loguear
      const data = await (window as any).colorManager.obtenerMisMezclas(undefined, 30)
      console.log("[MisMezclasView] Datos recibidos:", data)
      setMezclas(data || [])
    } catch (err) {
      console.error("[MisMezclasView] Error:", err)
      setError(err instanceof Error ? err.message : "Error al cargar mezclas")
    } finally {
      setCargando(false)
    }
  }

  const handleVerDetalle = (mezcla: RegistroMezcla) => {
    setSelectedMezcla(mezcla)
  }

  const handleRepetirDesdeModal = (mezcla: RegistroMezcla) => {
    onRepetirMezcla(mezcla)
  }

  const handleImprimir = (e: React.MouseEvent, mezcla: RegistroMezcla) => {
    e.stopPropagation() // Evitar abrir modal
    // TODO: Implementar impresión de etiqueta
    console.log("[MisMezclasView] Imprimir:", mezcla.id)
    alert(`Imprimiendo etiqueta para mezcla #${mezcla.recetaId}`)
  }

  const formatearFecha = (fecha: string) => {
    const d = new Date(fecha)
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getBadgeColor = (estado: string) => {
    switch (estado) {
      case "perfecto": return "bg-green-600"
      case "desviado": return "bg-orange-500"
      case "cancelado": return "bg-red-600"
      default: return "bg-gray-500"
    }
  }

  const getTipoBadge = (tipo?: string) => {
    switch (tipo) {
      case "RETOQUE": return { text: "Retoque", color: "bg-yellow-600" }
      case "AJUSTE_TONO": return { text: "Ajuste", color: "bg-purple-600" }
      default: return { text: "Nueva", color: "bg-blue-600" }
    }
  }

  return (
    <div className="h-screen bg-[#1e1e1e] flex flex-col">
      {/* Header */}
      <HeaderBar
        basculaConectada={true}
        onMisMezclasClick={undefined}
        onInventarioClick={undefined}
      />

      <MixDetailsModal
        isOpen={!!selectedMezcla}
        onClose={() => setSelectedMezcla(null)}
        mezcla={selectedMezcla}
        onRepetir={handleRepetirDesdeModal}
      />

      {/* Contenido */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Título y botón volver */}
        <div className="bg-[#252526] border-b border-[#3c3c3c] px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-[#cccccc]">📋 Mis Mezclas</h1>
            <p className="text-xs text-[#6e6e6e]">Últimos 7 días</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#cccccc] rounded text-sm transition-colors"
          >
            ← Volver
          </button>
        </div>

        {/* Tabla de mezclas */}
        <div className="flex-1 overflow-auto p-4">
          {cargando ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-[#6e6e6e] text-sm">Cargando mezclas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 border border-red-700 rounded p-4 text-red-300">
              ⚠️ {error}
            </div>
          ) : mezclas.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-[#6e6e6e] text-lg">No hay mezclas registradas</p>
                <p className="text-[#4e4e4e] text-sm mt-1">Las mezclas aparecerán aquí cuando las realices</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#252526] rounded border border-[#3c3c3c] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#2d2d2d] text-[#6e6e6e] text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Receta</th>
                    <th className="px-4 py-2 text-left">Color</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-right">Peso</th>
                    <th className="px-4 py-2 text-center">Estado</th>
                    <th className="px-4 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3c3c3c]">
                  {mezclas.map((mezcla) => {
                    const tipoBadge = getTipoBadge(mezcla.tipoMezcla)
                    return (
                      <tr
                        key={mezcla.id}
                        className="hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                        onClick={() => handleVerDetalle(mezcla)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-[#cccccc] font-mono">#{mezcla.recetaId}</span>
                          <p className="text-[#6e6e6e] text-xs">{mezcla.recetaNombre}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#cccccc]">{mezcla.colorCode || "-"}</span>
                        </td>
                        <td className="px-4 py-3 text-[#6e6e6e]">
                          {formatearFecha(mezcla.fecha)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${tipoBadge.color}`}>
                            {tipoBadge.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[#cccccc] font-mono">{mezcla.pesoFinal.toFixed(1)}g</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${getBadgeColor(mezcla.estado)}`}>
                            {mezcla.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRepetirDesdeModal(mezcla)
                              }}
                              className="p-1.5 hover:bg-[#3c3c3c] rounded transition-colors"
                              title="Repetir mezcla"
                            >
                              🔄
                            </button>
                            <button
                              onClick={(e) => handleImprimir(e, mezcla)}
                              className="p-1.5 hover:bg-[#3c3c3c] rounded transition-colors"
                              title="Reimprimir etiqueta"
                            >
                              🖨️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer con estadísticas */}
        <div className="bg-[#007acc] px-3 py-1 flex items-center justify-between text-[11px] text-white">
          <span>Total: {mezclas.length} mezclas</span>
          <span>
            ✅ {mezclas.filter(m => m.estado === 'perfecto').length} perfectas |
            ⚠️ {mezclas.filter(m => m.estado === 'desviado').length} desviadas
          </span>
        </div>
      </div>
    </div>
  )
}
