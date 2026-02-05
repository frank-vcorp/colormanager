/**
 * Hook usePrinter
 * Gestión centralizada de impresión física via IPC
 * ID Intervención: FIX-20260205-01
 */

import { useState, useCallback, useEffect } from "react"
import { PrinterInfo, PrintOptions } from "@shared/types"

interface UsePrinterReturn {
    imprimir: (options?: PrintOptions) => Promise<boolean>
    obtenerImpresoras: () => Promise<void>
    impresoras: PrinterInfo[]
    cargando: boolean
    imprimiendo: boolean
    error: string | null
}

export function usePrinter(): UsePrinterReturn {
    const [impresoras, setImpresoras] = useState<PrinterInfo[]>([])
    const [cargando, setCargando] = useState(false)
    const [imprimiendo, setImprimiendo] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const obtenerImpresoras = useCallback(async () => {
        if (!window.colorManager) return

        try {
            setCargando(true)
            setError(null)
            const res = await window.colorManager.getPrinters()

            if (res.success && res.data) {
                setImpresoras(res.data)
            } else {
                setError(res.error || "No se pudieron obtener las impresoras")
            }
        } catch (err) {
            setError(String(err))
        } finally {
            setCargando(false)
        }
    }, [])

    // Cargar impresoras al montar
    useEffect(() => {
        obtenerImpresoras()
    }, [obtenerImpresoras])

    const imprimir = useCallback(async (options: PrintOptions = {}) => {
        if (!window.colorManager) {
            setError("API de impresión no disponible")
            return false
        }

        try {
            setImprimiendo(true)
            setError(null)

            // Si no se especifica impresora, buscar la default en la lista
            // (Opcional: aquí podríamos leer una config guardada de "impresora de etiquetas")
            const currentOptions = { ...options }

            console.log(`[usePrinter] Imprimiendo... Device: ${currentOptions.printerName || "Default"}`)

            const res = await window.colorManager.printLabel(currentOptions)

            if (!res.success) {
                throw new Error(res.error || "Error desconocido al imprimir")
            }

            return true
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            setError(msg)
            console.error("[usePrinter] Error:", err)
            return false
        } finally {
            setImprimiendo(false)
        }
    }, [])

    return {
        imprimir,
        obtenerImpresoras,
        impresoras,
        cargando,
        imprimiendo,
        error
    }
}
