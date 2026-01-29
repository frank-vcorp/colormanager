import React from "react"
import Barcode from "react-barcode"
import { Producto } from "@shared/types"

interface Props {
  product: Producto
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
}

export const LabelTemplate: React.FC<Props> = ({ product }) => {
  return (
    <div className="w-[300px] h-[150px] border-2 border-black flex flex-col items-center justify-center p-2 bg-white text-black">
      <h2 className="text-xl font-bold text-center mb-1 leading-tight overflow-hidden text-ellipsis whitespace-nowrap w-full">
        {product.nombre}
      </h2>
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
        <Barcode
          value={product.sku}
          width={2}
          height={50}
          fontSize={16}
          margin={0}
          displayValue={true}
        />
      </div>
      <p className="text-xs mt-1">{new Date().toLocaleDateString()}</p>
    </div>
  )
}

// Wrapper para el modal de vista previa
export const PrintPreview: React.FC<Props> = (props) => {
  if (!props.isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 screen-only">
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4">Vista Previa</h2>
          
          <div className="border border-dashed border-gray-400 p-4 mb-4">
             <LabelTemplate {...props} />
          </div>

          <div className="flex gap-4 w-full">
            <button 
              onClick={props.onClose}
              className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={props.onPrint}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-bold"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Versión imprimible oculta en pantalla normal pero visible al imprimir */}
      <div className="hidden print:flex print:absolute print:top-0 print:left-0 print:w-full print:h-full print:bg-white print:items-start print:justify-center p-4">
        <LabelTemplate {...props} />
      </div>

      <style>{`
        @media print {
          .screen-only {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .print:flex, .print:flex * {
            visibility: visible;
          }
          .print:flex {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </>
  )
}
