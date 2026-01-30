/**
 * HeaderBar Component
 * Barra superior estilo IDE - compacta y funcional
 * 
 * ID Intervención: IMPL-20260127-05
 * @updated FIX-20260130-02: Rediseño estilo VS Code - más delgado y profesional
 */

interface HeaderBarProps {
  basculaConectada: boolean
  onHistorialClick?: () => void
  onInventarioClick?: () => void
}

export default function HeaderBar({ basculaConectada, onHistorialClick, onInventarioClick }: HeaderBarProps) {
  return (
    <header className="bg-[#1e1e1e] border-b border-[#3c3c3c] px-3 py-1.5 flex items-center justify-between select-none">
      {/* Logo compacto */}
      <div className="flex items-center gap-2">
        <span className="text-blue-400 text-sm">◆</span>
        <span className="text-[#cccccc] text-sm font-medium">ColorManager</span>
        <span className="text-[#6e6e6e] text-xs">- Auditor de Mezclas</span>
      </div>

      {/* Centro: Navegación */}
      <div className="flex items-center gap-1">
        {onInventarioClick && (
          <button
            onClick={onInventarioClick}
            className="px-3 py-1 text-[#cccccc] hover:bg-[#2a2a2a] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>📦</span> Inventario
          </button>
        )}
        {onHistorialClick && (
          <button
            onClick={onHistorialClick}
            className="px-3 py-1 text-[#cccccc] hover:bg-[#2a2a2a] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>📊</span> Historial
          </button>
        )}
      </div>

      {/* Derecha: Status */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${basculaConectada ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-[#6e6e6e]">Báscula</span>
          <span className={basculaConectada ? "text-green-400" : "text-red-400"}>
            {basculaConectada ? "OK" : "ERR"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-[#6e6e6e]">Impresora</span>
          <span className="text-yellow-400">RDY</span>
        </div>
      </div>
    </header>
  )
}
