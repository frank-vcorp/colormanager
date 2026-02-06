import React, { useRef, useState } from "react"

interface ManualAdjustmentPanelProps {
    totalGlobal: number
    ajusteStep: "escanear" | "pesar"
    ajusteSkuActual: string
    peso: number
    onValidarSku: (sku: string) => void
    onBypass: () => void
    onCancel: () => void
    onAddAdjustment: () => void
    onFinishAdjustments: () => void
}

export default function ManualAdjustmentPanel({
    totalGlobal,
    ajusteStep,
    ajusteSkuActual,
    peso,
    onValidarSku,
    onBypass,
    onCancel,
    onAddAdjustment,
    onFinishAdjustments,
}: ManualAdjustmentPanelProps) {
    const [inputValue, setInputValue] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            onValidarSku(inputValue)
            setInputValue("")
        }
    }

    return (
        <div className="min-h-screen bg-cm-bg flex flex-col">
            <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                <div className="text-center mb-4">
                    <h2 className="text-3xl font-bold text-gray-800">Ajuste Manual</h2>
                    <p className="text-gray-600">
                        Total actual:{" "}
                        <span className="font-bold text-blue-600">
                            {totalGlobal.toFixed(1)}g
                        </span>
                    </p>
                </div>

                {ajusteStep === "escanear" ? (
                    <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                        <p className="mb-4 text-gray-600 uppercase font-bold text-sm">
                            Escanea el tinte a agregar
                        </p>
                        <input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full text-center text-3xl font-black border-b-4 border-blue-500 focus:outline-none mb-6 uppercase"
                            placeholder="ESCANEAR..."
                            autoFocus
                        />

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={onBypass}
                                className="text-gray-400 text-xs hover:text-gray-600 underline"
                            >
                                Modo Pruebas (Sin Escáner)
                            </button>
                        </div>

                        <div className="mt-8 border-t border-gray-100 pt-4">
                            <button
                                onClick={onFinishAdjustments}
                                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                            >
                                ✅ Terminar Ajustes y Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    // PASO 2: PESAR
                    <div className="w-full max-w-2xl text-center">
                        <div className="mb-6">
                            <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">
                                Agregando
                            </p>
                            <h2 className="text-6xl font-black text-gray-900">
                                {ajusteSkuActual}
                            </h2>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-blue-500 mb-8">
                            <p className="text-gray-400 text-sm mb-2">PESO AGREGADO</p>
                            <p className="text-8xl font-black text-blue-600 tabular-nums">
                                {peso.toFixed(1)}
                                <span className="text-4xl text-gray-400">g</span>
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onAddAdjustment}
                                className="flex-[2] py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-2xl shadow-lg transition-colors"
                            >
                                💾 Registrar +{Math.max(0, peso).toFixed(1)}g
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
