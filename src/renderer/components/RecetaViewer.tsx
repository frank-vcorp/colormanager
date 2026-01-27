/**
 * RecetaViewer Component
 * Visualización de recetas detectadas por el parser Sayer
 * Muestra metadatos e ingredientes en tabla interactiva
 * 
 * ID Intervención: IMPL-20260127-03
 * @see SPEC-SAYER-PARSER.md
 */

import { RecetaSayer } from "@shared/types"

interface RecetaViewerProps {
  receta: RecetaSayer
  onDismiss: () => void
}

export default function RecetaViewer({ receta, onDismiss }: RecetaViewerProps) {
  // Calcular peso total de la receta
  const pesoTotal = receta.capas.reduce((sum, capa) => {
    return (
      sum +
      capa.ingredientes.reduce((capaSum, ing) => capaSum + ing.pesoMeta, 0)
    )
  }, 0)

  return (
    <div className="w-full max-w-4xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-6 shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-blue-900 mb-2">
            📋 Receta #{receta.numero}
          </h2>
          <p className="text-sm text-blue-700">
            Historia: <span className="font-mono font-bold">{receta.historia}</span>
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          ✕ Descartar
        </button>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-white rounded p-4 border border-blue-200">
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase">Fabricante</p>
          <p className="text-lg font-bold text-blue-900">
            {receta.meta.carMaker || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase">Color Code</p>
          <p className="text-lg font-bold text-blue-900 font-mono">
            {receta.meta.colorCode || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase">Código Sayer</p>
          <p className="text-lg font-bold text-blue-900 font-mono">
            {receta.meta.sayerCode || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase">Peso Total</p>
          <p className="text-lg font-bold text-blue-900">
            {pesoTotal.toFixed(1)}g
          </p>
        </div>
      </div>

      {/* Capas e Ingredientes */}
      <div className="space-y-4">
        {receta.capas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Sin capas definidas</p>
          </div>
        ) : (
          receta.capas.map((capa, capaIdx) => {
            const capaTotal = capa.ingredientes.reduce(
              (sum, ing) => sum + ing.pesoMeta,
              0
            )

            return (
              <div
                key={capaIdx}
                className="bg-white rounded-lg border border-blue-300 overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                {/* Capa Header */}
                <div className="bg-blue-200 px-4 py-3">
                  <h3 className="font-bold text-blue-900 text-lg">
                    {capa.nombre}
                  </h3>
                  <p className="text-xs text-blue-700 font-mono">
                    Subtotal: {capaTotal.toFixed(1)}g
                  </p>
                </div>

                {/* Ingredientes Table */}
                <div className="overflow-x-auto">
                  {capa.ingredientes.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 italic">
                      Sin ingredientes
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-blue-100 border-b border-blue-300">
                          <th className="px-4 py-2 text-left text-blue-800 font-semibold">
                            #
                          </th>
                          <th className="px-4 py-2 text-left text-blue-800 font-semibold">
                            SKU
                          </th>
                          <th className="px-4 py-2 text-right text-blue-800 font-semibold">
                            Peso Meta (g)
                          </th>
                          <th className="px-4 py-2 text-center text-blue-800 font-semibold">
                            % del Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {capa.ingredientes.map((ing, idx) => {
                          const porcentaje = (
                            (ing.pesoMeta / pesoTotal) *
                            100
                          ).toFixed(1)
                          return (
                            <tr
                              key={idx}
                              className={`border-b border-blue-100 ${
                                idx % 2 === 0 ? "bg-blue-50" : "bg-white"
                              } hover:bg-blue-100 transition-colors`}
                            >
                              <td className="px-4 py-2 text-gray-700 font-bold">
                                {ing.orden}
                              </td>
                              <td className="px-4 py-2 text-gray-700 font-mono font-semibold">
                                {ing.sku}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900 font-bold">
                                {ing.pesoMeta.toFixed(1)}
                              </td>
                              <td className="px-4 py-2 text-center text-gray-700">
                                <span className="inline-block bg-blue-200 px-2 py-1 rounded text-xs font-bold">
                                  {porcentaje}%
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-6 flex gap-2 justify-end">
        <button
          onClick={onDismiss}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-medium transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
