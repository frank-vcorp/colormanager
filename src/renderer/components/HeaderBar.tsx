/**
 * HeaderBar Component
 * Barra superior con estado del sistema y navegación
 * 
 * ID Intervención: IMPL-20260127-05
 */

interface HeaderBarProps {
  basculaConectada: boolean
  onHistorialClick?: () => void
  onInventarioClick?: () => void
}

export default function HeaderBar({ basculaConectada, onHistorialClick, onInventarioClick }: HeaderBarProps) {
  return (
    <header className="bg-cm-surface border-b border-cm-border px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between max-w-full">
        {/* Logo/Title */}
        <div>
          <h1 className="text-xl font-bold text-cm-text">
            ◆ ColorManager
          </h1>
          <p className="text-xs text-cm-text-secondary">
            Auditor de Mezclas
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex gap-6 text-sm">
          {/* Scale Status */}
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              basculaConectada ? "bg-cm-success animate-pulse" : "bg-cm-danger"
            }`} />
            <span className="text-cm-text-secondary">
              Báscula: <span className="font-bold text-cm-text">
                {basculaConectada ? "OK" : "ERROR"}
              </span>
            </span>
          </div>

          {/* Printer Status (placeholder) */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cm-warning" />
            <span className="text-cm-text-secondary">
              Impresora: <span className="font-bold text-cm-text">READY</span>
            </span>
          </div>

          {/* Inventario Button */}
          {onInventarioClick && (
            <button
              onClick={onInventarioClick}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📦 Inventario
            </button>
          )}

          {/* Historial Button */}
          {onHistorialClick && (
            <button
              onClick={onHistorialClick}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📊 Historial
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
