import React, { useState, useEffect } from "react"
import Barcode from "react-barcode"
import { Producto } from "@shared/types"
import { usePrinter } from "../../hooks/usePrinter"

interface Props {
  product: Producto
  // FIX-20260205-02: Campo opcional para datos de lote específico
  lote?: {
    numero: string
    fecha?: string
  }
  // FIX-20260206-03: Sufijo visual para trazabilidad (ej: .01) separado del código de barras
  visualSuffix?: string
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
}

export const LabelTemplate: React.FC<Props> = ({ product, lote, visualSuffix }) => {
  return (
    <div
      className="bg-white text-black flex flex-col items-center justify-between p-1 overflow-hidden font-sans print-content"
      style={{
        width: "50mm",
        height: "30mm",
        boxSizing: "border-box"
      }}
    >
      <style>{`
        .print-content {
           border: 1px solid black;
        }
        @media print {
          .print-content {
            border: none !important;
          }
        }
      `}</style>

      <h2
        className="text-center font-bold leading-none mb-0.5 w-full text-ellipsis overflow-hidden whitespace-nowrap"
        style={{ fontSize: "3.5mm" }}
      >
        {product.nombre}
      </h2>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-[95%] overflow-hidden flex justify-center">
          {/* El código de barras SIEMPRE usa el SKU base para facilitar validación */}
          <Barcode
            value={product.sku}
            width={1.2}
            height={30}
            fontSize={9}
            marginBottom={1}
            marginTop={1}
            displayValue={true}
          />
        </div>
      </div>

      <div className="w-full flex justify-between items-end border-t border-black pt-0.5 mt-0.5">
        <span style={{ fontSize: "2.5mm" }}>
          {new Date().toLocaleDateString("es-MX", { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </span>

        {lote ? (
          <span className="font-bold flex items-center" style={{ fontSize: "2.8mm", paddingRight: "3mm" }}>
            Lte. {lote.numero}{visualSuffix}
          </span>
        ) : (
          <span style={{ fontSize: "2.5mm", paddingRight: "3mm" }}>
            {/* Si no hay lote, mostramos SKU + Suffix como trazabilidad visual */}
            SKU: {product.sku}{visualSuffix}
          </span>
        )}
      </div>
    </div>
  )
}

// Wrapper para el modal de vista previa
export const PrintPreview: React.FC<Props> = (props) => {
  const { imprimir, obtenerImpresoras, impresoras, cargando, imprimiendo, error } = usePrinter()
  const [selectedPrinter, setSelectedPrinter] = useState<string>("")
  const [cantidad, setCantidad] = useState<number>(1)
  const [serializar, setSerializar] = useState<boolean>(false)

  // Cargar impresoras al abrir
  useEffect(() => {
    if (props.isOpen) {
      obtenerImpresoras()
    }
  }, [props.isOpen, obtenerImpresoras])

  // Seleccionar default
  useEffect(() => {
    if (impresoras.length > 0 && !selectedPrinter) {
      const def = impresoras.find(p => p.isDefault)
      if (def) setSelectedPrinter(def.name)
      else setSelectedPrinter(impresoras[0].name)
    }
  }, [impresoras, selectedPrinter])

  // Auto-activar serialización si cantidad > 1
  useEffect(() => {
    if (cantidad > 1) setSerializar(true)
    else setSerializar(false)
  }, [cantidad])

  const handlePrint = async () => {
    const success = await imprimir({
      printerName: selectedPrinter,
      silent: true, // Impresión silenciosa para etiquetas
      data: {
        sku: props.product.sku,
        nombre: props.product.nombre,
        lote: props.lote,
        quantity: cantidad,
        printSerials: serializar
      }
    })

    if (success) {
      // Opcional: Cerrar al terminar o mostrar éxito
      // props.onClose() 
    }
  }

  if (!props.isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 screen-only">
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center max-w-sm w-full">
          <h2 className="text-xl font-bold mb-4">Vista Previa</h2>

          <div className="border border-dashed border-gray-400 p-4 mb-4">
            <LabelTemplate {...props} />
            {cantidad > 1 && (
              <p className="text-xs text-center text-gray-500 mt-2">
                Se imprimirán {cantidad} etiquetas {serializar ? "con serial" : "idénticas"}
              </p>
            )}
          </div>

          <div className="flex gap-4 w-full mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                max="100"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                disabled={cargando || imprimiendo}
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serializar}
                  onChange={(e) => setSerializar(e.target.checked)}
                  className="mr-2 h-4 w-4"
                  disabled={cargando || imprimiendo}
                />
                Numerar (.01, .02...)
              </label>
            </div>
          </div>

          {/* Selector de Impresora */}
          <div className="w-full mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Impresora</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              disabled={cargando || imprimiendo}
            >
              {cargando ? (
                <option>Cargando impresoras...</option>
              ) : impresoras.length === 0 ? (
                <option>No se encontraron impresoras</option>
              ) : (
                impresoras.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.displayName || p.name} {p.isDefault ? "(Predeterminada)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {error && (
            <div className="w-full mb-4 p-2 bg-red-100 text-red-700 text-xs rounded">
              {error}
            </div>
          )}

          <div className="flex gap-4 w-full">
            <button
              onClick={props.onClose}
              className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              disabled={imprimiendo}
            >
              Cancelar
            </button>
            <button
              onClick={handlePrint}
              disabled={imprimiendo || cargando || impresoras.length === 0}
              className={`flex-1 px-4 py-2 text-white rounded transition-colors font-bold flex justify-center items-center gap-2 ${imprimiendo ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {imprimiendo ? "Imprimiendo..." : "🖨️ Imprimir"}
            </button>
          </div>
        </div>
      </div>

      {/* Versión imprimible oculta en pantalla normal pero visible al imprimir */}
      {/* Versión imprimible con clase específica para la nueva estrategia CSS */}
      <div className="hidden print-container">
        <LabelTemplate {...props} />
      </div>

      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0;
          }
          
          body {
            background-color: white;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Forzar contraste máximo y negro puro para códigos de barras nítidos */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  )
}
