/**
 * MixDetailsModal Component
 * Modal para ver el detalle de una mezcla histórica
 * Muestra:
 * - Cabecera con info de receta/cliente
 * - Tabla comparativa de ingredientes (Meta vs Real)
 * - Diferencias y errores porcentuales
 * - Botón para Repetir Mezcla
 * 
 * Update: Modal autocontenido para eliminar dependencia de ui/Modal (Context-based)
 */

import { RegistroMezcla } from "@shared/types"

interface MixDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    mezcla: RegistroMezcla | null
    onRepetir: (mezcla: RegistroMezcla) => void
}

export default function MixDetailsModal({
    isOpen,
    onClose,
    mezcla,
    onRepetir
}: MixDetailsModalProps) {
    if (!isOpen || !mezcla) return null

    const handleRepetirClick = () => {
        onRepetir(mezcla)
        onClose()
    }

    // Parsear ingredientes si vienen como string (prevención)
    const ingredientes = typeof mezcla.ingredientes === 'string'
        ? JSON.parse(mezcla.ingredientes as any)
        : mezcla.ingredientes

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4 z-10 animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-4 border-b border-[#3c3c3c] flex justify-between items-center bg-[#252526] rounded-t-lg">
                    <h2 className="text-lg font-medium text-[#cccccc]">
                        Detalle Mezcla <span className="text-blue-400 font-mono">#{mezcla.recetaId}</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#6e6e6e] hover:text-white transition-colors text-xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-4 bg-[#252526] p-4 rounded border border-[#3c3c3c]">
                        <div>
                            <p className="text-[#6e6e6e] text-xs uppercase tracking-wider mb-1">Cliente</p>
                            <p className="text-[#cccccc] font-medium truncate">{mezcla.cliente || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[#6e6e6e] text-xs uppercase tracking-wider mb-1">Vehículo</p>
                            <p className="text-[#cccccc] font-medium truncate">{mezcla.vehiculo || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[#6e6e6e] text-xs uppercase tracking-wider mb-1">Fecha</p>
                            <p className="text-[#cccccc] font-medium">
                                {new Date(mezcla.fecha).toLocaleDateString()} {mezcla.horaInicio}
                            </p>
                        </div>
                        <div>
                            <p className="text-[#6e6e6e] text-xs uppercase tracking-wider mb-1">Operador</p>
                            <p className="text-[#cccccc] font-medium truncate">{mezcla.operadorNombre || "-"}</p>
                        </div>
                    </div>

                    {/* Tabla Ingredientes */}
                    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-[#2d2d2d] text-[#aeaeae]">
                                <tr>
                                    <th className="px-4 py-3 text-left">SKU</th>
                                    <th className="px-4 py-3 text-right">Meta (g)</th>
                                    <th className="px-4 py-3 text-right">Real (g)</th>
                                    <th className="px-4 py-3 text-right">Dif</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2d2d2d]">
                                {ingredientes.map((ing: any, idx: number) => {
                                    const diff = ing.pesoPesado - ing.pesoTarget

                                    return (
                                        <tr key={idx} className="hover:bg-[#252526] transition-colors">
                                            <td className="px-4 py-3 font-mono text-blue-300 font-medium">{ing.codigo}</td>
                                            <td className="px-4 py-3 text-right text-[#999]">{ing.pesoTarget.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-right font-medium text-[#ccc]">{ing.pesoPesado.toFixed(1)}</td>
                                            <td className={`px-4 py-3 text-right font-medium ${diff > 0.5 ? "text-yellow-500" : diff < -0.5 ? "text-red-400" : "text-green-500"
                                                }`}>
                                                {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="bg-[#252526] font-bold text-[#cccccc] border-t border-[#3c3c3c]">
                                <tr>
                                    <td className="px-4 py-3">TOTAL</td>
                                    <td className="px-4 py-3 text-right">{mezcla.pesoTotal.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">{mezcla.pesoFinal.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {mezcla.diferencia > 0 ? "+" : ""}{mezcla.diferencia.toFixed(1)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[#3c3c3c] bg-[#252526] rounded-b-lg flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[#cccccc] hover:bg-[#3c3c3c] rounded text-sm transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleRepetirClick}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                    >
                        🔄 Repetir esta Mezcla
                    </button>
                </div>
            </div>
        </div>
    )
}
