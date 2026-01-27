/**
 * InventoryView Component
 * Vista de control de inventario (Micro-Sprint 5)
 * Muestra stock de productos con indicadores visuales de nivel
 * 
 * ID Intervención: IMPL-20260127-05
 */

import { useState, useEffect } from "react"
import { Producto } from "@shared/types"

export default function InventoryView() {
  const [inventario, setInventario] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar inventario al montar
  useEffect(() => {
    cargarInventario()
  }, [])

  const cargarInventario = async () => {
    try {
      setCargando(true)
      setError(null)
      const data = await window.colorManager.obtenerInventario()
      setInventario(data)
    } catch (err) {
      setError("Error al cargar inventario")
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const resetearStock = async () => {
    if (!confirm("¿Resetear inventario a valores iniciales?")) return
    try {
      const data = await window.colorManager.resetearInventario()
      setInventario(data)
    } catch (err) {
      setError("Error al resetear inventario")
      console.error(err)
    }
  }

  // Determinar color del stock basado en nivel
  const getStockColor = (stock: number): string => {
    if (stock > 1000) return "#10b981" // Verde
    if (stock >= 500) return "#f59e0b" // Amarillo
    return "#ef4444" // Rojo
  }

  // Calcular porcentaje visual (asumiendo máximo 2000g)
  const getStockPercentage = (stock: number): number => {
    return Math.min(100, (stock / 2000) * 100)
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">📦 Control de Inventario</h1>
        <p className="text-slate-400 text-sm">Estado actual del stock de tintes</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Cargando */}
      {cargando && (
        <div className="flex items-center justify-center flex-1">
          <div className="text-slate-400">Cargando inventario...</div>
        </div>
      )}

      {/* Tabla de inventario */}
      {!cargando && inventario.length > 0 && (
        <>
          <div className="flex-1 overflow-auto mb-6">
            <div className="space-y-3">
              {inventario.map((producto) => {
                const color = getStockColor(producto.stockActual)
                const percentage = getStockPercentage(producto.stockActual)
                const estado =
                  producto.stockActual > 1000
                    ? "✅ Normal"
                    : producto.stockActual >= 500
                      ? "⚠️ Bajo"
                      : "🔴 Crítico"

                return (
                  <div
                    key={producto.sku}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                  >
                    {/* Fila superior: SKU y Nombre */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-mono text-sm text-purple-400 font-semibold">
                          {producto.sku}
                        </div>
                        <div className="text-white text-sm font-medium">{producto.nombre}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ color }}>
                          {producto.stockActual.toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-400">{producto.unidad}</div>
                      </div>
                    </div>

                    {/* Barra de progreso visual */}
                    <div className="mb-2">
                      <div className="h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 8px ${color}40`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila inferior: Porcentaje y Estado */}
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <div>{Math.round(percentage)}% del máximo</div>
                      <div style={{ color }}>{estado}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botón Resetear */}
          <div className="flex gap-4">
            <button
              onClick={cargarInventario}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors border border-slate-600"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={resetearStock}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
            >
              🔧 Resetear Stock
            </button>
          </div>
        </>
      )}

      {/* Vacío */}
      {!cargando && inventario.length === 0 && (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center text-slate-400">
            <div className="text-4xl mb-2">📭</div>
            <div>No hay productos en el inventario</div>
          </div>
        </div>
      )}
    </div>
  )
}
