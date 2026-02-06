import React, { useEffect, useState } from "react"
import { useLocation } from "react-router-dom" // Asumiendo que usamos router, o nativo
import { LabelTemplate } from "./ui/LabelTemplate"
import { Producto } from "@shared/types"

/**
 * Vista dedicada para la ventana oculta de impresión.
 * Lee los datos del producto/lote desde los parámetros de la URL (Query String).
 */
export default function PrintLabelView() {
    const [data, setData] = useState<{ product: Producto, lote?: { numero: string; fecha?: string } } | null>(null)

    useEffect(() => {
        // Parsear parámetros de la URL
        // Formato esperado: #/print-label?sku=...&nombre=...&lote=...
        const hash = window.location.hash
        const queryString = hash.split('?')[1]
        const params = new URLSearchParams(queryString)

        const sku = params.get("sku") || "UNKNOWN"
        const nombre = params.get("nombre") || "Sin Nombre"

        // Construir objeto producto mínimo necesario para LabelTemplate
        const product: Producto = {
            sku,
            nombre,
            stockActual: 0, // No relevante para impresión
            stockMinimo: 0,
            costo: 0,
            ultimoCosto: 0,
            id: 0,
            unidadMedida: "ml",
            categoria: "General",
            updatedAt: new Date().toISOString()
        }

        // Datos de lote opcionales
        const loteNumero = params.get("lote")
        const loteFecha = params.get("fechaLote")

        const lote = loteNumero ? {
            numero: loteNumero,
            fecha: loteFecha || undefined
        } : undefined

        setData({ product, lote })

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
            <LabelTemplate
                product={data.product}
                lote={data.lote}
                isOpen={true}
                onClose={() => { }}
                onPrint={() => { }}
            />

            {/* Estilos globales forzados para esta vista */}
            <style>{`
        body, html, #root {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: white;
            overflow: hidden;
        }
      `}</style>
        </div>
    )
}
