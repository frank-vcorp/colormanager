/**
 * PrinterMonitor Component
 * Visualiza el estado en tiempo real de la impresora virtual y su cola de trabajos
 * 
 * ID Intervención: ARCH-20260130-04
 */

import { useState, useEffect } from "react"
import { PrinterStatus, PrintJob } from "@shared/types"

export default function PrinterMonitor() {
    const [status, setStatus] = useState<PrinterStatus>({ state: "IDLE", jobsCount: 0 })
    const [queue, setQueue] = useState<PrintJob[]>([])
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        if (!window.colorManager) return

        window.colorManager.onPrinterStatus((newStatus) => {
            setStatus(newStatus)
        })

        window.colorManager.onPrinterQueue((newQueue) => {
            setQueue(newQueue)
        })
    }, [])

    const getStateColor = () => {
        switch (status.state) {
            case "RECEIVING": return "text-blue-400 animate-pulse"
            case "PROCESSING": return "text-yellow-400 animate-spin"
            case "ERROR": return "text-red-500"
            default: return "text-green-500"
        }
    }

    const getStateLabel = () => {
        switch (status.state) {
            case "RECEIVING": return "Recibiendo..."
            case "PROCESSING": return "Procesando..."
            case "ERROR": return "Error"
            default: return "Listo"
        }
    }

    return (
        <div className="flex flex-col gap-2 min-w-[200px]">
            {/* Botón de Estado Principal */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between bg-[#2a2a2a] hover:bg-[#3c3c3c] border border-[#3c3c3c] rounded px-3 py-1.5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className={`text-sm ${getStateColor()}`}>
                        {status.state === "PROCESSING" ? "⚙" : "🖨️"}
                    </span>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-[#6e6e6e] uppercase font-bold leading-none">Impresora ColorManager</span>
                        <span className="text-xs text-[#cccccc] font-medium">{getStateLabel()}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-[#6e6e6e] leading-none">Cola</span>
                    <span className="text-xs text-blue-400">{status.jobsCount} trabajos</span>
                </div>
            </button>

            {/* Panel Expandido: Cola de Impresión */}
            {expanded && (
                <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-[#2a2a2a] px-3 py-2 border-b border-[#3c3c3c] flex justify-between items-center">
                        <span className="text-xs font-bold text-[#cccccc] uppercase tracking-wider">Historial de Trabajos</span>
                        <button onClick={() => setExpanded(false)} className="text-[#6e6e6e] hover:text-white">✕</button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {queue.length === 0 ? (
                            <div className="p-8 text-center text-[#6e6e6e] text-xs italic">
                                No hay trabajos recientes
                            </div>
                        ) : (
                            <div className="divide-y divide-[#3c3c3c]">
                                {queue.map((job) => (
                                    <div key={job.id} className="p-3 hover:bg-[#252525] transition-colors group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${job.status === "SUCCESS" ? "bg-green-500" : "bg-red-500"}`} />
                                                <span className="text-xs font-bold text-[#cccccc]">
                                                    {job.recetaNumero ? `Receta #${job.recetaNumero}` : "Documento Raw"}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-[#6e6e6e]">
                                                {new Date(job.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-[#555555] font-mono truncate mb-1">
                                            {job.preview}...
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-[#6e6e6e]">Tamaño: {(job.size / 1024).toFixed(2)} KB</span>
                                            <span className={`text-[10px] font-bold ${job.status === "SUCCESS" ? "text-green-600/50" : "text-red-600/50"}`}>
                                                {job.status === "SUCCESS" ? "COMPLETADO" : "ERROR PARSE"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-[#2a2a2a] p-2 text-center border-t border-[#3c3c3c]">
                        <p className="text-[9px] text-[#555555]">Escuchando en 127.0.0.1:9100</p>
                    </div>
                </div>
            )}
        </div>
    )
}
