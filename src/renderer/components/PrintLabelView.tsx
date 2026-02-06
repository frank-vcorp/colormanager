import React, { useEffect, useState } from "react"
import { LabelTemplate } from "./ui/LabelTemplate"
import { Producto } from "@shared/types"

/**
 * Vista dedicada para la ventana oculta de impresión.
 * Lee los datos del producto/lote desde los parámetros de la URL (Query String).
 */
export default function PrintLabelView() {
    const [data, setData] = useState<{
        product: Producto,
        lote?: { numero: string; fecha?: string },
        quantity?: number,
        printSerials?: boolean
    } | null>(null)

    useEffect(() => {
        // FIX-20260206-02: Leer params de window.location.search (Query Params nativos)
        // URL esperada: index.html?mode=print&sku=...&nombre=...
        const params = new URLSearchParams(window.location.search)

        const sku = params.get("sku") || "UNKNOWN"
        const nombre = params.get("nombre") || "Sin Nombre"

        // Construir objeto producto mínimo necesario para LabelTemplate
        const product: Producto = {
            sku,
            nombre,
            stockActual: 0,
            unidad: "ml", // Valor por defecto válido
            // Otros campos opcionales fuera
        }

        // Datos de lote opcionales
        const loteNumero = params.get("lote")
        const loteFecha = params.get("fechaLote")

        const lote = loteNumero ? {
            numero: loteNumero,
            fecha: loteFecha || undefined
        } : undefined

        // REQ-20260206-01: Cantidad y Serialización
        const quantity = parseInt(params.get("quantity") || "1")
        const printSerials = params.get("printSerials") === "true"

        setData({ product, lote, quantity, printSerials })

        // Auto-ajustar título documento para debug
        document.title = `Imprimiendo ${sku}`

    }, [])

    if (!data) return <div className="p-2 text-xs">Cargando etiqueta...</div>

    return (
        <div className="w-full h-full bg-white flex items-start justify-start p-0 m-0 overflow-hidden">
            {/* 
         LabelTemplate está diseñado para 50x30mm.
         Aquí lo renderizamos directamente.
         Ya no necesitamos 'isOpen' ni callbacks porque esta ventana ES la vista previa/final.
      */}
            {/* 
                Forzamos posicionamiento absoluto en top-left para garantizar que 
                impresoras pequeñas (Niimbot) no centren el contenido si el papel es más grande.
            */}
            {/* 
                Renderizado Múltiple (REQ-20260206-01)
                Generamos N copias de la etiqueta. Si printSerials es true, agregamos sufijo.
            */}
            {Array.from({ length: 1 }).map((_, globalIndex) => {
                // El padre es el contenedor absoluto principal
                // Pero necesitamos iterar según la cantidad
                const labels = []
                const quantity = data.quantity || 1
                const printSerials = data.printSerials || false

                for (let i = 0; i < quantity; i++) {
                    const serialSuffix = printSerials ? `.${(i + 1).toString().padStart(2, '0')}` : ""

                    // Clonar datos base y modificar si hay serial
                    const labelProduct = { ...data.product }
                    const labelLote = data.lote ? { ...data.lote } : undefined

                    if (printSerials) {
                        // Inyectar serial en SKU o Lote
                        if (labelLote) {
                            labelLote.numero = `${labelLote.numero}${serialSuffix}`
                        } else {
                            labelProduct.sku = `${labelProduct.sku}${serialSuffix}`
                        }
                    }

                    labels.push(
                        <div key={i} style={{
                            position: 'relative',
                            width: '50mm',
                            height: '30mm',
                            // Forzar salto de página después de cada etiqueta, excepto la última
                            pageBreakAfter: i < quantity - 1 ? 'always' : 'auto'
                        }}>
                            <LabelTemplate
                                product={labelProduct}
                                lote={labelLote}
                                isOpen={true}
                                onClose={() => { }}
                                onPrint={() => { }}
                            />
                        </div>
                    )
                }
                return labels
            })}

            {/* Estilos globales forzados para esta vista */}
            <style>{`
        @page {
            size: 50mm 30mm;
            margin: 0;
        }
        body, html, #root {
            margin: 0;
            padding: 0;
            width: 50mm;
            height: 30mm;
            background: white;
            overflow: hidden;
        }
      `}</style>
        </div>
    )
}
