/**
 * SmartScale Component
 * Componente visual inteligente para mostrar peso actual vs. peso target
 * Incluye barra de progreso, feedback cromático y display numérico
 * 
 * Estilo: Industrial limpio, tipografía grande (pantalla táctil/taller)
 * ID Intervención: IMPL-20260127-04
 * @see SPEC-UX-COLORMANAGER.md
 */

interface SmartScaleProps {
  pesoActual: number
  pesoTarget: number
  tolerancia?: number // Default: 0.5g
}

/**
 * Componente que visualiza el progreso del pesaje
 * - Feedback cromático: Gris/Amarillo (falta) → Verde (en rango) → Rojo (pasado)
 * - Barra de progreso que ilustra gráficamente cuánto falta
 * - Display numérico grande y legible
 */
export default function SmartScale({
  pesoActual,
  pesoTarget,
  tolerancia = 0.5,
}: SmartScaleProps) {
  // Calcular porcentaje de progreso
  const porcentaje = (pesoActual / pesoTarget) * 100
  const falta = Math.max(0, pesoTarget - pesoActual)

  // Determinar estado y color
  const minTarget = pesoTarget - tolerancia
  const maxTarget = pesoTarget + tolerancia

  let estado: "espera" | "en_rango" | "pasado" = "espera"
  let colorClase = "bg-gray-300"
  let colorTexto = "text-gray-700"
  let colorBarra = "bg-yellow-400"
  let estadoTexto = "Pesando..."

  if (pesoActual >= maxTarget) {
    estado = "pasado"
    colorClase = "bg-red-100"
    colorTexto = "text-red-700"
    colorBarra = "bg-red-500"
    estadoTexto = "¡PASADO!"
  } else if (pesoActual >= minTarget && pesoActual <= maxTarget) {
    estado = "en_rango"
    colorClase = "bg-green-100"
    colorTexto = "text-green-700"
    colorBarra = "bg-green-500"
    estadoTexto = "✓ EN RANGO"
  } else if (pesoActual > 0) {
    colorClase = "bg-yellow-100"
    colorTexto = "text-yellow-700"
    colorBarra = "bg-yellow-400"
  } else {
    colorClase = "bg-gray-100"
    colorTexto = "text-gray-600"
    colorBarra = "bg-gray-400"
    estadoTexto = "Listo para pesar"
  }

  return (
    <div className={`w-full max-w-2xl ${colorClase} border-3 border-gray-800 rounded-lg p-8 shadow-xl`}>
      {/* Display Numérico Grande */}
      <div className="text-center mb-6">
        <div className={`text-8xl font-black ${colorTexto} font-mono tracking-tighter`}>
          {pesoActual.toFixed(1)}
        </div>
        <div className={`text-2xl font-bold ${colorTexto} mt-2`}>
          de {pesoTarget.toFixed(1)} g
        </div>
        <div className={`text-3xl font-bold ${colorTexto} mt-4`}>
          {estadoTexto}
        </div>
      </div>

      {/* Información de Progreso */}
      <div className="grid grid-cols-3 gap-4 mb-6 bg-white bg-opacity-60 rounded p-4 border border-gray-300">
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold uppercase">Falta</p>
          <p className="text-2xl font-black text-gray-800">{falta.toFixed(1)}g</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold uppercase">Progreso</p>
          <p className="text-2xl font-black text-gray-800">{Math.round(porcentaje)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold uppercase">Tolerancia</p>
          <p className="text-2xl font-black text-gray-800">±{tolerancia.toFixed(1)}g</p>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="mb-4">
        <div className="w-full h-16 bg-gray-200 border-2 border-gray-400 rounded-lg overflow-hidden shadow-inner">
          <div
            className={`h-full ${colorBarra} transition-all duration-300 ease-out flex items-center justify-end pr-4`}
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          >
            {porcentaje > 20 && (
              <span className="text-white font-black text-3xl drop-shadow-lg">
                {Math.round(porcentaje)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de Rango */}
      <div className="bg-white rounded p-3 border border-gray-300">
        <div className="text-xs font-semibold text-gray-600 mb-2 uppercase">
          Rango Aceptable
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-800">
          <span>{minTarget.toFixed(1)}g</span>
          <span>▬▬▬▬</span>
          <span>{maxTarget.toFixed(1)}g</span>
        </div>
      </div>

      {/* Estado Detallado */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {estado === "espera" && "Agregue ingrediente lentamente"}
          {estado === "en_rango" && "✓ Peso dentro de especificación"}
          {estado === "pasado" && "✗ Se ha excedido el peso target"}
        </p>
      </div>
    </div>
  )
}
