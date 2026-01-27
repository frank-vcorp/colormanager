/**
 * InventoryView Component
 * Vista de control de inventario (Micro-Sprint 5)
 * Versión Simplificada: Tabla blanca limpia con navegación
 * 
 * ID Intervención: FIX-UX-20260127
 */

import { useState, useEffect } from "react"
import { Producto } from "@shared/types"

interface Props {
  onBack: () => void
}

export default function InventoryView({ onBack }: Props) {
  const [inventario, setInventario] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarInventario()
  }, [])

  const cargarInventario = async () => {
    try {
      setCargando(true)
      const data = await window.colorManager.obtenerInventario()
      setInventario(data)
    } catch (err) {
      setError("Error al cargar inventario")
    } finally {
      setCargando(false)
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📦 Inventario de Tintes</h1>
          <p className="text-gray-500 mt-1">Gestión de stock en tiempo real</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetearStock}
            className="px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
          >
            Resetear Stock
          </button>
          <button
             onClick={onBack}
             className="px-6 py-2 bg-gray-800 text-white rounded shadow hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
          >
            <span>←</span> Volver
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-gray-500">Cargando datos...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">SKU / Código</th>
                  <th className="p-4 font-semibold">Nombre del Tinte</th>
                  <th className="p-4 font-semibold text-right">Stock Disponible</th>
                  <th className="p-4 font-semibold text-center">Estado</th>
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

                  return (
                    <tr key={prod.sku} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-gray-600 font-medium">{prod.sku}</td>
                      <td className="p-4 text-gray-800 font-medium">{prod.nombre}</td>
                      <td className="p-4 text-right font-mono font-bold text-lg">
                        {prod.stockActual.toFixed(1)} <span className="text-gray-400 text-sm font-normal">g</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
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
    </div>
  )
}
