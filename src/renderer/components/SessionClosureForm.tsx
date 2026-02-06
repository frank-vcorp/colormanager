import React, { useState } from "react"
import { User, Car, Printer } from "lucide-react"

interface SessionClosureFormProps {
    pesoFinalCalculado: number
    recetaMeta: {
        carMaker?: string
        colorCode?: string
    }
    onBack: () => void
    onSave: (data: { cliente: string; vehiculo: string; guardarReceta: boolean }) => void
    guardando: boolean
}

export default function SessionClosureForm({
    pesoFinalCalculado,
    recetaMeta,
    onBack,
    onSave,
    guardando,
}: SessionClosureFormProps) {
    const [cliente, setCliente] = useState("")
    const [vehiculo, setVehiculo] = useState("")
    // const [guardarReceta, setGuardarReceta] = useState(false) // Deshabilitado por ahora

    const handleSubmit = () => {
        onSave({
            cliente,
            vehiculo,
            guardarReceta: false, // Forzado a falso por ahora
        })
    }

    return (
        <div className="min-h-screen bg-cm-bg flex flex-col">
            <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                <div className="text-center mb-4">
                    <h2 className="text-3xl font-bold text-gray-800">Cierre de Mezcla</h2>
                    <p className="text-gray-600 text-lg">
                        Final:{" "}
                        <span className="font-bold text-blue-600">
                            {pesoFinalCalculado.toFixed(1)}g
                        </span>{" "}
                        - {recetaMeta.carMaker} {recetaMeta.colorCode}
                    </p>
                </div>

                <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg border border-gray-200 space-y-6">
                    {/* Cliente */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <User size={18} /> Cliente / Taller
                        </label>
                        <input
                            type="text"
                            value={cliente}
                            onChange={(e) => setCliente(e.target.value)}
                            placeholder="Ej. Juan Pérez / Taller Central"
                            className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-0"
                        />
                    </div>

                    {/* Vehículo */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <Car size={18} /> Vehículo / Placa
                        </label>
                        <input
                            type="text"
                            value={vehiculo}
                            onChange={(e) => setVehiculo(e.target.value)}
                            placeholder="Ej. Nissan Tsuru 2010"
                            className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-0"
                        />
                    </div>

                    {/* Checkbox Receta (Placeholder - Hidden) */}
                    {/* 
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input type="checkbox" ... />
             ...
          </div> 
          */}
                </div>

                <div className="flex gap-4 w-full max-w-lg">
                    <button
                        onClick={onBack}
                        className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
                    >
                        Atrás
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={guardando}
                        className="flex-[2] py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-xl"
                    >
                        {guardando ? (
                            <span>⏳ Guardando...</span>
                        ) : (
                            <>
                                <Printer size={24} />
                                <span>Finalizar y Etiquetar</span>
                            </>
                        )}
                    </button>
                </div>
            </main>
        </div>
    )
}
