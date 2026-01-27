/**
 * ScaleDisplay Component
 * Muestra el peso en tiempo real con estilo industrial
 * 
 * ID Intervención: IMPL-20260127-01
 */

interface ScaleDisplayProps {
  pesoActual: number
  mezclando: boolean
}

export default function ScaleDisplay({ pesoActual, mezclando }: ScaleDisplayProps) {
  return (
    <div className="w-full max-w-2xl bg-cm-surface border-2 border-cm-border rounded-lg p-8 text-center">
      <p className="text-cm-text-secondary text-sm uppercase tracking-widest mb-4">
        Peso Actual
      </p>

      <div className={`weight-display transition-all duration-100 ${
        mezclando ? "text-cm-primary" : "text-cm-text-secondary"
      }`}>
        {pesoActual.toFixed(1)}
      </div>

      <p className="text-cm-text-secondary mt-4 text-lg">gramos</p>

      {/* Barra de progreso simple */}
      {mezclando && (
        <div className="mt-6">
          <div className="w-full bg-cm-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-cm-primary h-full transition-all duration-200"
              style={{ width: `${Math.min((pesoActual / 150) * 100, 100)}%` }}
            />
          </div>
          <p className="text-sm text-cm-text-secondary mt-2">
            Progreso: {Math.round((pesoActual / 150) * 100)}%
          </p>
        </div>
      )}
    </div>
  )
}
