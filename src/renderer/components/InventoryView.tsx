/**
 * InventoryView Component
 * Vista de control de inventario (Micro-Sprint 5 + IMPL-20260127-09)
 * Versión Simplificada: Tabla blanca limpia con navegación y importador SICAR
 * 
 * ID Intervención: FIX-UX-20260127 + IMPL-20260127-09
 * @updated IMPL-20260128-03: Agregar botón y estado de sincronización con nube (Micro-Sprint 10)
 * @updated IMPL-20260128-02: Agregar columna Acciones y Modal de ajuste de stock (Micro-Sprint 11)
 * @updated IMPL-20260128-03: Agregar botón 🖨️ y Modal de impresión de etiquetas (Micro-Sprint 12)
 * @updated IMPL-20260128-01: Agregar protección de roles - solo ADMIN puede importar y ajustar
 * @updated IMPL-20260129-02: Agregar expansión de filas para ver Lotes Activos (Sprint 2.6 - FIFO)
 * @updated ARCH-20260204-01: Agregar botón de etiqueta QR en sub-tabla de lotes
 * @updated FIX-20260205-02: Agregar botón de etiqueta Bote en sub-tabla de lotes
 */

import React, { useState, useEffect } from "react"
import { Producto, AjusteStockParams } from "@shared/types"
import { ImportacionResultado } from "@shared/types"
import { PrintPreview } from "./ui/LabelTemplate"
import { QRLabelModal } from "./ui/QRLabelModal"
import { useAuth } from "../context/AuthProvider"

/**
 * FIX-20260204-20: Mapeo de sufijos SICAR a presentación
 * El stock viene en ml, pero queremos mostrar cuántos botes equivale
 */
const SICAR_PRESENTATION: Record<string, { label: string; ml: number }> = {
  "10": { label: "250ml", ml: 250 },
  "20": { label: "500ml", ml: 500 },
  "30": { label: "1L", ml: 1000 },
  "40": { label: "4L", ml: 4000 },
  "50": { label: "19L", ml: 19000 },
}

/**
 * FIX-20260204-20: Extrae info de presentación de un SKU SICAR
 * @returns { presentacion: "4L", botes: 2 } o null si no tiene sufijo
 */
function getPresentacionInfo(sku: string, stockMl: number): { presentacion: string; botes: number } | null {
  const match = sku.match(/\.(\d{2})$/)
  if (!match) return null

  const suffix = match[1]
  const pres = SICAR_PRESENTATION[suffix]
  if (!pres) return null

  return {
    presentacion: pres.label,
    botes: Math.round((stockMl / pres.ml) * 10) / 10, // Redondear a 1 decimal
  }
}

interface Props {
  onBack: () => void
}

interface SyncState {
  status: "idle" | "syncing" | "success" | "error"
  timestamp?: string
  message?: string
  processed?: number
}

interface ModalAjuste {
  abierto: boolean
  sku?: string
  nombre?: string
  operacion: "sumar" | "restar"
  cantidad: string
  motivo: string
  procesando: boolean
  error?: string
}

interface ModalImpresion {
  abierto: boolean
  producto?: Producto
  // FIX-20260205-02: Soporte para imprimir lote específico
  lote?: { numero: string; fecha?: string }
}

// ARCH-20260204-01: Estado para modal de etiqueta QR
interface ModalQR {
  abierto: boolean
  loteId: string | null
}

export default function InventoryView({ onBack }: Props) {
  const { isAdmin } = useAuth()
  const [inventario, setInventario] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [mensajeImportacion, setMensajeImportacion] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" })
  const [expandedRow, setExpandedRow] = useState<string | null>(null) // IMPL-20260129-02: SKU de fila expandida
  const [modal, setModal] = useState<ModalAjuste>({
    abierto: false,
    operacion: "restar",
    cantidad: "",
    motivo: "",
    procesando: false,
  })
  const [modalImpresion, setModalImpresion] = useState<ModalImpresion>({
    abierto: false,
  })
  // ARCH-20260204-01: Estado para modal de etiqueta QR
  const [modalQR, setModalQR] = useState<ModalQR>({
    abierto: false,
    loteId: null,
  })

  useEffect(() => {
    cargarInventario()
  }, [])

  const cargarInventario = async () => {
    try {
      setCargando(true)
      setError(null)
      // FIX-20260130-01: El handler devuelve {success, data} o array directo
      const response = await window.colorManager.obtenerInventario() as any
      if (response && response.success && Array.isArray(response.data)) {
        setInventario(response.data)
      } else if (Array.isArray(response)) {
        // Compatibilidad con respuesta directa
        setInventario(response)
      } else {
        setError(response?.error || "Respuesta inesperada del servidor")
        setInventario([])
      }
    } catch (err) {
      console.error("[InventoryView] Error al cargar inventario:", err)
      setError(err instanceof Error ? err.message : "Error al cargar inventario")
      setInventario([])
    } finally {
      setCargando(false)
    }
  }

  const abrirModalAjuste = (sku: string, nombre: string) => {
    setModal({
      abierto: true,
      sku,
      nombre,
      operacion: "restar",
      cantidad: "",
      motivo: "",
      procesando: false,
      error: undefined,
    })
  }

  const cerrarModal = () => {
    setModal({
      abierto: false,
      operacion: "restar",
      cantidad: "",
      motivo: "",
      procesando: false,
    })
  }

  const abrirModalImpresion = (producto: Producto, lote?: { numero: string; fecha?: string }) => {
    setModalImpresion({
      abierto: true,
      producto,
      lote
    })
  }

  const cerrarModalImpresion = () => {
    setModalImpresion({
      abierto: false,
    })
  }

  // ARCH-20260204-01: Funciones para modal de etiqueta QR
  const abrirModalQR = (loteId: string) => {
    setModalQR({
      abierto: true,
      loteId,
    })
  }

  const cerrarModalQR = () => {
    setModalQR({
      abierto: false,
      loteId: null,
    })
  }

  const imprimirEtiqueta = () => {
    // Usar window.print() nativa del navegador/Electron
    // El componente LabelTemplate ya tiene los estilos @media print configurados
    window.print()
  }

  const toggleExpandRow = (sku: string, e?: React.MouseEvent) => {
    // Evitar que el click en botones dispare la expansión
    if (e) {
      e.stopPropagation()
    }
    setExpandedRow(expandedRow === sku ? null : sku)
  }

  const guardarAjuste = async () => {
    if (!modal.sku || !modal.cantidad || !modal.motivo) {
      setModal({ ...modal, error: "Todos los campos son obligatorios" })
      return
    }

    const cant = parseFloat(modal.cantidad)
    if (isNaN(cant) || cant <= 0) {
      setModal({ ...modal, error: "La cantidad debe ser mayor a 0" })
      return
    }

    try {
      setModal({ ...modal, procesando: true, error: undefined })

      const params: AjusteStockParams = {
        sku: modal.sku,
        cantidad: cant,
        motivo: modal.motivo,
        operacion: modal.operacion,
      }

      const respuesta = await window.colorManager.ajustarStock(params)

      if (!respuesta.success) {
        setModal({
          ...modal,
          procesando: false,
          error: respuesta.error || "Error al ajustar stock",
        })
        return
      }

      // Éxito: recargar inventario y cerrar modal
      await cargarInventario()
      cerrarModal()
    } catch (err) {
      setModal({
        ...modal,
        procesando: false,
        error: `Error: ${String(err)}`,
      })
    }
  }

  const resetearStock = async () => {
    if (!confirm("¿Resetear todo el stock a valores iniciales?")) return
    try {
      const data = await window.colorManager.resetearInventario()
      setInventario(data)
    } catch (err) {
      alert("Error al resetear")
    }
  }

  const importarSicar = async () => {
    try {
      setImportando(true)
      setMensajeImportacion(null)

      const respuesta = await window.colorManager.importarInventarioCSV()

      if (!respuesta.success) {
        setMensajeImportacion(`❌ Error: ${respuesta.error}`)
        return
      }

      const resultado = respuesta.data as ImportacionResultado

      // Construir mensaje de resumen
      const detalles = [
        `${resultado.procesados} registros procesados`,
        `${resultado.actualizados} actualizados`,
        `${resultado.creados} creados`,
      ]

      if (resultado.errores.length > 0) {
        detalles.push(`${resultado.errores.length} errores`)
      }

      setMensajeImportacion(
        `✅ Importación completada: ${detalles.join(" | ")}`
      )

      // Recargar inventario después de la importación exitosa
      await cargarInventario()

      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setMensajeImportacion(null), 5000)
    } catch (err) {
      setMensajeImportacion(`❌ Error: ${String(err)}`)
    } finally {
      setImportando(false)
    }
  }

  const sincronizarInventario = async () => {
    try {
      setSyncState({ status: "syncing" })

      const respuesta = await window.colorManager.sincronizarInventario()

      if (!respuesta.success) {
        setSyncState({
          status: "error",
          message: respuesta.error || "Error en sincronización",
          timestamp: new Date().toLocaleString(),
        })
        // Limpiar estado después de 5 segundos
        setTimeout(() => setSyncState({ status: "idle" }), 5000)
        return
      }

      // const resultado = respuesta
      setSyncState({
        status: "success",
        message: `✅ Sincronización exitosa`,
        processed: respuesta.processed || 0,
        timestamp: new Date().toLocaleString(),
      })

      // Limpiar estado después de 5 segundos
      setTimeout(() => setSyncState({ status: "idle" }), 5000)
    } catch (err) {
      setSyncState({
        status: "error",
        message: `❌ Error: ${String(err)}`,
        timestamp: new Date().toLocaleString(),
      })
      setTimeout(() => setSyncState({ status: "idle" }), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 Inventario de Tintes</h1>
          <p className="text-gray-500 mt-1">Gestión de stock en tiempo real</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isAdmin && (
            <button
              onClick={importarSicar}
              disabled={importando}
              className={`px-4 py-2 text-sm rounded transition-colors font-medium flex items-center gap-2 ${importando
                  ? "bg-blue-200 text-blue-700 cursor-not-allowed"
                  : "bg-blue-100 text-blue-600 border border-blue-200 hover:bg-blue-200"
                }`}
            >
              {importando ? "📥 Importando..." : "📥 Importar SICAR"}
            </button>
          )}
          <button
            onClick={sincronizarInventario}
            disabled={syncState.status === "syncing"}
            className={`px-4 py-2 text-sm rounded transition-colors font-medium flex items-center gap-2 ${syncState.status === "syncing"
                ? "bg-purple-200 text-purple-700 cursor-not-allowed"
                : syncState.status === "success"
                  ? "bg-green-100 text-green-600 border border-green-200 hover:bg-green-200"
                  : syncState.status === "error"
                    ? "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200"
                    : "bg-purple-100 text-purple-600 border border-purple-200 hover:bg-purple-200"
              }`}
          >
            {syncState.status === "syncing"
              ? "☁️ Sincronizando..."
              : syncState.status === "success"
                ? "✅ Sincronizado"
                : "☁️ Sincronizar"}
          </button>

          {/* ARCH-20260204-01: Botón para imprimir todas las etiquetas QR */}
          <button
            onClick={async () => {
              const confirmacion = confirm("¿Imprimir etiquetas QR de todos los lotes pendientes?")
              if (!confirmacion) return
              const result = await window.colorManager.imprimirTodasEtiquetas()
              if (result.success) {
                alert(`✅ Se imprimieron ${result.printed} etiquetas`)
              } else {
                alert(`❌ Error: ${result.error}`)
              }
            }}
            className="px-4 py-2 text-sm text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors font-medium"
          >
            🏷️ Imprimir Etiquetas QR
          </button>

          {isAdmin && (
            <button
              onClick={resetearStock}
              className="px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
            >
              Resetear Stock
            </button>
          )}

          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-800 text-white rounded shadow hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>←</span> Volver
          </button>
        </div>
      </div>

      {/* Mensaje de Importación */}
      {mensajeImportacion && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
          {mensajeImportacion}
        </div>
      )}

      {/* Estado de Sincronización */}
      {syncState.status !== "idle" && (
        <div
          className={`max-w-6xl mx-auto mb-6 p-4 rounded-lg text-sm ${syncState.status === "syncing"
              ? "bg-purple-50 border border-purple-200 text-purple-800"
              : syncState.status === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
        >
          <div className="font-medium">{syncState.message}</div>
          {syncState.processed !== undefined && syncState.status === "success" && (
            <div className="text-xs mt-1">Se sincronizaron {syncState.processed} productos</div>
          )}
          {syncState.timestamp && (
            <div className="text-xs mt-1 opacity-75">{syncState.timestamp}</div>
          )}
        </div>
      )}

      {/* Contenido - con scroll vertical */}
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-gray-500">Cargando datos...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">SKU / Código</th>
                  <th className="p-4 font-semibold">Nombre del Tinte</th>
                  <th className="p-4 font-semibold text-center">Presentación</th>
                  <th className="p-4 font-semibold text-right">Unidades</th>
                  <th className="p-4 font-semibold text-right">Stock (ml)</th>
                  <th className="p-4 font-semibold text-center">Estado</th>
                  <th className="p-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventario.map((prod) => {
                  // Lógica de estado visual
                  let statusColor = "bg-green-100 text-green-700"
                  let statusText = "Normal"

                  if (prod.stockActual < 500) {
                    statusColor = "bg-orange-100 text-orange-700"
                    statusText = "Bajo"
                  }
                  if (prod.stockActual < 100) {
                    statusColor = "bg-red-100 text-red-700"
                    statusText = "Crítico"
                  }

                  const isExpanded = expandedRow === prod.sku
                  const hasLotes = prod.lotes && prod.lotes.length > 0

                  // FIX-20260204-20: Obtener info de presentación
                  const presInfo = getPresentacionInfo(prod.sku, prod.stockActual)

                  return (
                    <React.Fragment key={prod.sku}>
                      {/* Fila Principal - Clickeable para expandir */}
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          // No expandir si hace click en botones
                          if ((e.target as HTMLElement).closest('button')) {
                            return
                          }
                          toggleExpandRow(prod.sku)
                        }}
                      >
                        <td className="p-4 font-mono text-gray-600 font-medium">
                          <span className="mr-2">
                            {hasLotes ? (isExpanded ? "▼" : "▶") : "•"}
                          </span>
                          {prod.sku}
                        </td>
                        <td className="p-4 text-gray-800 font-medium">{prod.nombre}</td>
                        <td className="p-4 text-center">
                          {presInfo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                              {presInfo.presentacion}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-lg">
                          {presInfo ? (
                            <>{presInfo.botes}</>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono text-sm text-gray-600">
                          {prod.stockActual.toFixed(0)} <span className="text-gray-400 text-xs">ml</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="p-4 text-center flex gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              abrirModalImpresion(prod)
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded hover:bg-blue-200 transition-colors font-medium"
                            title="Imprimir etiqueta de inventario"
                          >
                            🖨️ Imprimir
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                abrirModalAjuste(prod.sku, prod.nombre)
                              }}
                              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-200 transition-colors font-medium"
                            >
                              📝 Ajustar
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Fila Expandida - Sub-tabla de Lotes (IMPL-20260129-02) */}
                      {isExpanded && hasLotes && (
                        <tr className="bg-gray-50 border-l-4 border-blue-400">
                          <td colSpan={5} className="p-4">
                            <div className="ml-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                📦 Lotes Activos ({prod.lotes!.length})
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs bg-white border border-gray-200 rounded">
                                  <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                      <th className="p-2 text-left font-semibold text-gray-600">N° Lote</th>
                                      <th className="p-2 text-right font-semibold text-gray-600">Cantidad (g)</th>
                                      <th className="p-2 text-center font-semibold text-gray-600">Estado</th>
                                      <th className="p-2 text-left font-semibold text-gray-600">Creado</th>
                                      <th className="p-2 text-center font-semibold text-gray-600">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {prod.lotes!.map((lote) => {
                                      let estadoColor = "bg-green-100 text-green-700"
                                      if (lote.estado === "parcial") estadoColor = "bg-yellow-100 text-yellow-700"
                                      if (lote.estado === "agotado") estadoColor = "bg-gray-100 text-gray-700"

                                      return (
                                        <tr key={lote.id} className="hover:bg-gray-50">
                                          <td className="p-2 font-mono text-gray-700">{lote.numeroLote}</td>
                                          <td className="p-2 text-right font-mono font-semibold text-gray-800">
                                            {lote.cantidad.toFixed(1)}
                                          </td>
                                          <td className="p-2 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor}`}>
                                              {lote.estado}
                                            </span>
                                          </td>
                                          <td className="p-2 text-gray-600 text-xs">
                                            {new Date(lote.createdAt).toLocaleDateString("es-MX")}
                                          </td>
                                          {/* FIX-20260205-02: Botones de impresión (Bote y QR) */}
                                          <td className="p-2 text-center flex gap-1 justify-center">
                                            {/* Botón etiqueta legible */}
                                            <button
                                              onClick={() => abrirModalImpresion(prod, { numero: lote.numeroLote, fecha: lote.createdAt })}
                                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded hover:bg-blue-200 transition-colors font-medium flex items-center gap-1"
                                              title="Imprimir etiqueta de Bote (Texto)"
                                            >
                                              🖨️ Bote
                                            </button>

                                            {/* Botón QR */}
                                            <button
                                              onClick={() => abrirModalQR(lote.id)}
                                              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded hover:bg-purple-200 transition-colors font-medium flex items-center gap-1"
                                              title="Imprimir etiqueta QR"
                                            >
                                              🏷️ QR
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>

            {inventario.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                No hay productos en el inventario.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Ajuste */}
      {modal.abierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Ajustar Stock</h2>
            <p className="text-gray-600 text-sm mb-4">{modal.nombre} ({modal.sku})</p>

            {/* Selector de Operación */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Operación
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setModal({ ...modal, operacion: "sumar" })}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${modal.operacion === "sumar"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                    }`}
                >
                  ➕ Ingreso
                </button>
                <button
                  onClick={() => setModal({ ...modal, operacion: "restar" })}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${modal.operacion === "restar"
                      ? "bg-red-100 text-red-700 border border-red-300"
                      : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                    }`}
                >
                  ➖ Salida/Merma
                </button>
              </div>
            </div>

            {/* Input Cantidad */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad (gramos)
              </label>
              <input
                type="number"
                value={modal.cantidad}
                onChange={(e) => setModal({ ...modal, cantidad: e.target.value })}
                placeholder="Ej: 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Select Motivo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo
              </label>
              <select
                value={modal.motivo}
                onChange={(e) => setModal({ ...modal, motivo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar --</option>
                <option value="Corrección Conteo">Corrección Conteo</option>
                <option value="Merma/Derrame">Merma/Derrame</option>
                <option value="Entrada Extra">Entrada Extra</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Error */}
            {modal.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {modal.error}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2">
              <button
                onClick={cerrarModal}
                disabled={modal.procesando}
                className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarAjuste}
                disabled={modal.procesando}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {modal.procesando ? "Guardando..." : "Guardar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impresión */}
      {modalImpresion.abierto && modalImpresion.producto && (
        <PrintPreview
          product={modalImpresion.producto}
          lote={modalImpresion.lote}
          isOpen={modalImpresion.abierto}
          onClose={cerrarModalImpresion}
          onPrint={imprimirEtiqueta}
        />
      )}

      {/* ARCH-20260204-01: Modal de Etiqueta QR */}
      <QRLabelModal
        isOpen={modalQR.abierto}
        loteId={modalQR.loteId}
        onClose={cerrarModalQR}
      />
    </div>
  )
}
