/**
 * ScaleDisplay Component
 * Muestra el peso en tiempo real con estilo industrial/IDE
 * 
 * ID Intervención: IMPL-20260127-01
 * @updated FIX-20260130-02: Rediseño estilo VS Code - fondo oscuro
 */

interface ScaleDisplayProps {
  pesoActual: number
  mezclando: boolean
}

export default function ScaleDisplay({ pesoActual, mezclando }: ScaleDisplayProps) {
  return (
    <div className="text-center">
      {/* Label superior */}
      <p className="text-[#6e6e6e] text-xs uppercase tracking-[0.3em] mb-2">
        Peso Actual
      </p>

      {/* PESO GIGANTE */}
      <div className={`font-mono font-light tracking-tight transition-colors duration-100 ${
        mezclando ? "text-blue-400" : "text-[#e0e0e0]"
      }`} style={{ fontSize: "8rem", lineHeight: 1 }}>
        {pesoActual.toFixed(1)}
      </div>

      {/* Unidad */}
      <p className="text-[#6e6e6e] text-lg mt-2">gramos</p>

      {/* Barra de progreso cuando está mezclando */}
      {mezclando && (
        <div className="mt-8 w-80 mx-auto">
          <div className="w-full bg-[#3c3c3c] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-200"
              style={{ width: `${Math.min((pesoActual / 150) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-[#6e6e6e] mt-2">
            Progreso: {Math.round((pesoActual / 150) * 100)}%
          </p>
        </div>
      )}
    </div>
  )
}
