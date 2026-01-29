/**
 * LabelTemplate Component
 * Genera etiqueta imprimible de producto con código de barras
 * 
 * Micro-Sprint 12: Etiquetado PDF de Inventario
 * ID Intervención: IMPL-20260128-03
 * 
 * @description Componente que renderiza una etiqueta de inventario imprimible
 * con código de barras Code 128, nombre del producto y SKU. Diseñado para
 * imprimirse a través de window.print() con estilos específicos @media print.
 */

import { useRef } from "react"
import Barcode from "react-barcode"
import { Producto } from "@shared/types"

interface LabelTemplateProps {
  product: Producto
  size?: "small" | "medium" | "large"
}

/**
 * LabelTemplate: Renderiza etiqueta imprimible de inventario
 * 
 * Características:
 * - Código de barras Code 128 del SKU
 * - Nombre del producto prominente
 * - SKU legible
 * - Fecha de impresión
 * - Diseño para impresora térmica o convencional
 * 
 * @param product - Objeto Producto con sku, nombre, etc.
 * @param size - Tamaño de la etiqueta (pequeña: 7.5cm x 5cm, mediana: 10cm x 6.5cm, grande: 15cm x 10cm)
 * @returns JSX con la etiqueta imprimible
 */
export function LabelTemplate({ product, size = "medium" }: LabelTemplateProps) {
  const labelRef = useRef<HTMLDivElement>(null)

  // Configuración de tamaños
  const sizeConfigs = {
    small: {
      width: "7.5cm",
      height: "5cm",
      padding: "0.3cm",
      nameSize: "text-lg",
      skuSize: "text-xs",
      barcodeScale: 1,
    },
    medium: {
      width: "10cm",
      height: "6.5cm",
      padding: "0.5cm",
      nameSize: "text-2xl",
      skuSize: "text-sm",
      barcodeScale: 1.2,
    },
    large: {
      width: "15cm",
      height: "10cm",
      padding: "0.75cm",
      nameSize: "text-4xl",
      skuSize: "text-base",
      barcodeScale: 1.5,
    },
  }

  const config = sizeConfigs[size]
  const currentDate = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          
          body {
            background: white !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            min-height: 100vh !important;
            padding: 0 !important;
          }
          
          #label-template-container {
            display: block !important;
            width: ${config.width} !important;
            height: ${config.height} !important;
          }
          
          .label-hidden-on-print {
            display: none !important;
          }
        }
        
        @media screen {
          .label-template {
            background: white;
            border: 2px solid #333;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>

      {/* Contenedor de etiqueta */}
      <div
        ref={labelRef}
        id="label-template-container"
        className="label-template"
        style={{
          width: config.width,
          height: config.height,
          padding: config.padding,
          backgroundColor: "white",
          border: "2px solid #333",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Sección Superior: Nombre del Producto */}
        <div style={{ textAlign: "center", marginBottom: "0.2cm" }}>
          <div
            className={config.nameSize}
            style={{
              fontWeight: "bold",
              color: "#000",
              wordWrap: "break-word",
              lineHeight: "1.1",
              overflow: "hidden",
              maxHeight: "1.5cm",
            }}
          >
            {product.nombre.toUpperCase()}
          </div>
        </div>

        {/* Sección Media: Código de Barras */}
        <div style={{ textAlign: "center", display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `scale(${config.barcodeScale})`, transformOrigin: "center" }}>
            <Barcode
              value={product.sku}
              format="CODE128"
              width={2}
              height={50}
              displayValue={false}
              margin={0}
            />
          </div>
        </div>

        {/* Sección Inferior: SKU y Fecha */}
        <div style={{ textAlign: "center" }}>
          <div
            className={config.skuSize}
            style={{
              fontWeight: "bold",
              color: "#000",
              fontFamily: "monospace",
              marginBottom: "0.1cm",
            }}
          >
            SKU: {product.sku}
          </div>
          <div
            style={{
              fontSize: "0.65cm",
              color: "#666",
              fontStyle: "italic",
            }}
          >
            {currentDate}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * PrintPreview: Modal con vista previa de etiqueta e impresión
 * 
 * Utiliza el componente LabelTemplate dentro de un modal
 * con botones para visualizar e imprimir.
 */
interface PrintPreviewProps {
  product: Producto
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
}

export function PrintPreview({ product, isOpen, onClose, onPrint }: PrintPreviewProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Vista Previa de Etiqueta
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <LabelTemplate product={product} size="medium" />
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <button
            onClick={onPrint}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            🖨️ Imprimir
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#e5e7eb",
              color: "#374151",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
