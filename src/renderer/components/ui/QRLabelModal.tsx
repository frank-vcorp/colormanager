/**
 * Modal de Preview e Impresión de Etiqueta QR
 * 
 * ID Intervención: ARCH-20260204-01
 * Ruta SPEC: context/specs/SPEC-ETIQUETAS-QR.md
 * 
 * Muestra preview de etiqueta con código QR y permite imprimir.
 */

import React, { useEffect, useState } from 'react'

interface EtiquetaData {
  codigo: string
  nombre: string
  sku: string
  loteId: string
  qrDataUrl?: string
}

interface Props {
  isOpen: boolean
  loteId: string | null
  onClose: () => void
  onPrintSuccess?: () => void
}

export const QRLabelModal: React.FC<Props> = ({ 
  isOpen, 
  loteId, 
  onClose,
  onPrintSuccess 
}) => {
  const [etiqueta, setEtiqueta] = useState<EtiquetaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  useEffect(() => {
    if (isOpen && loteId) {
      cargarEtiqueta()
    } else {
      // Reset state when closing
      setEtiqueta(null)
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, loteId])
  
  const cargarEtiqueta = async () => {
    if (!loteId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.colorManager.obtenerEtiquetaQR(loteId)
      
      if (result.success && result.data) {
        setEtiqueta(result.data)
      } else {
        setError(result.error || 'Error al cargar etiqueta')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }
  
  const imprimir = async () => {
    if (!loteId) return
    
    setImprimiendo(true)
    setError(null)
    setSuccessMsg(null)
    
    try {
      const result = await window.colorManager.imprimirEtiquetaQR(loteId)
      
      if (result.success) {
        setSuccessMsg('✓ Etiqueta enviada a imprimir')
        onPrintSuccess?.()
        // Cerrar después de 1.5 segundos
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Error al imprimir')
      }
    } catch (err) {
      setError('Error de conexión con impresora')
    } finally {
      setImprimiendo(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🏷️</span>
          Etiqueta QR
        </h2>
        
        {/* Mensajes de error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}
        
        {/* Mensaje de éxito */}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {successMsg}
          </div>
        )}
        
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando...</span>
          </div>
        )}
        
        {/* Preview de Etiqueta */}
        {etiqueta && !loading && (
          <div className="border-2 border-dashed border-gray-300 p-4 mb-4 bg-gray-50 rounded-lg">
            {/* Simulación de etiqueta 40x30mm */}
            <div className="w-[200px] h-[150px] mx-auto flex flex-col items-center justify-center border-2 border-gray-400 bg-white p-3 rounded shadow-sm">
              {etiqueta.qrDataUrl && (
                <img 
                  src={etiqueta.qrDataUrl} 
                  alt="QR Code" 
                  className="w-24 h-24"
                />
              )}
              <p className="text-lg font-bold font-mono mt-2 text-gray-900">
                {etiqueta.codigo}
              </p>
              <p className="text-xs text-gray-500 truncate w-full text-center">
                {etiqueta.nombre}
              </p>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              📐 Tamaño real: 40×30mm
            </p>
          </div>
        )}
        
        {/* Info adicional */}
        {etiqueta && !loading && (
          <div className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg">
            <p><strong>SKU:</strong> {etiqueta.sku}</p>
            <p><strong>Código de Bote:</strong> {etiqueta.codigo}</p>
          </div>
        )}
        
        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={imprimiendo}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={imprimir}
            disabled={imprimiendo || loading || !etiqueta}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {imprimiendo ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Imprimiendo...
              </>
            ) : (
              <>
                🖨️ Imprimir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRLabelModal
