import React from "react"

interface MixSummaryProps {
    recetaNumero: string
    pesoTotal: number
    pesoFinalCalculado: number
    onManualAdjustment: () => void
    onContinue: () => void
}

export default function MixSummary({
    recetaNumero,
    pesoTotal,
    pesoFinalCalculado,
    onManualAdjustment,
    onContinue,
}: MixSummaryProps) {
    const dif = pesoFinalCalculado - pesoTotal
    const esExacto = Math.abs(dif) <= 0.5

    return (
        <div className="min-h-screen bg-cm-bg flex flex-col">
            <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-gray-800 mb-2">
                        ¡Mezcla Completada!
                    </h2>
                    <p className="text-gray-600">Receta #{recetaNumero}</p>
                </div>

                <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">
                            Meta
                        </p>
                        <p className="text-4xl font-black text-blue-600">
                            {pesoTotal.toFixed(1)}g
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">
                            Obtenido
                        </p>
                        <p
                            className={`text-4xl font-black ${esExacto ? "text-green-600" : "text-yellow-600"
                                }`}
                        >
                            {pesoFinalCalculado.toFixed(1)}g
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">
                            Diferencia
                        </p>
                        <p
                            className={`text-4xl font-black ${esExacto ? "text-green-600" : "text-red-500"
                                }`}
                        >
                            {dif > 0 ? "+" : ""}
                            {dif.toFixed(1)}g
                        </p>
                    </div>
                </div>

                <div className="flex gap-6 mt-8">
                    <button
                        onClick={onManualAdjustment}
                        className="px-8 py-6 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-2 border-yellow-400 rounded-xl font-bold text-xl flex flex-col items-center gap-2 transition-all"
                    >
                        <span>🧪 Ajustar Manualmente</span>
                        <span className="text-sm font-normal opacity-75">
                            Agregar más tinte/base
                        </span>
                    </button>

                    <button
                        onClick={onContinue}
                        className="px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-2xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center gap-2"
                    >
                        <span>🏁 Continuar al Cierre</span>
                        <span className="text-sm font-normal opacity-90">
                            Ingresar datos finales
                        </span>
                    </button>
                </div>
            </main>
        </div>
    )
}
