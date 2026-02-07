/**
 * HeaderBar Component
 * Barra superior estilo IDE - compacta y funcional
 * 
 * ID Intervención: IMPL-20260127-05
 * @updated FIX-20260130-02: Rediseño estilo VS Code - más delgado y profesional
 * @updated ARCH-20260130-01: Agregar botón Admin y Mis Mezclas
 */

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthProvider"
import PrinterMonitor from "./PrinterMonitor"

interface HeaderBarProps {
  basculaConectada: boolean
  onMisMezclasClick?: () => void
  onHistorialClick?: () => void
  onInventarioClick?: () => void
  onAdminClick?: () => void
  onSettingsClick?: () => void
}

export default function HeaderBar({
  basculaConectada,
  onMisMezclasClick,
  onHistorialClick,
  onInventarioClick,
  onAdminClick,
  onSettingsClick
}: HeaderBarProps) {
  const { user, isAdmin, logout } = useAuth()
  const [mode, setMode] = useState<"DEMO" | "PRODUCTION">("DEMO")

  useEffect(() => {
    if (!window.colorManager) return

    // 1. Obtener estado inicial
    window.colorManager.invoke("config:get").then((res: any) => {
      if (res?.success && res?.config) {
        setMode(res.config.mode)
      }
    })

    // 2. Escuchar cambios
    const cleanup = window.colorManager.onConfigChanged((data) => {
      if (data.newConfig) setMode(data.newConfig.mode)
      else if (data.mode) setMode(data.mode as "DEMO" | "PRODUCTION")
    })

    return cleanup as () => void
  }, [])

  const toggleMode = async () => {
    const newMode = mode === "DEMO" ? "PRODUCTION" : "DEMO"
    await window.colorManager.invoke("config:setMode", newMode)
  }

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
        {/* Mis Mezclas - Siempre visible para entonador */}
        {onMisMezclasClick && (
          <button
            onClick={onMisMezclasClick}
            className="px-3 py-1 text-[#cccccc] hover:bg-[#2a2a2a] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>📋</span> Mis Mezclas
          </button>
        )}
        {/* Inventario - Siempre visible (sin precios para entonador) */}
        {onInventarioClick && (
          <button
            onClick={onInventarioClick}
            className="px-3 py-1 text-[#cccccc] hover:bg-[#2a2a2a] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>📦</span> Inventario
          </button>
        )}
        {/* Historial completo - Solo Admin */}
        {isAdmin && onHistorialClick && (
          <button
            onClick={onHistorialClick}
            className="px-3 py-1 text-[#cccccc] hover:bg-[#2a2a2a] rounded text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>📊</span> Historial
          </button>
        )}

        {/* Monitor de Impresión Virtual - ARCH-20260130-04 */}
        <div className="ml-4">
          <PrinterMonitor />
        </div>
      </div>

      {/* Derecha: Status + Admin */}
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

        {/* Selector de Modo (Solo Admin) - FIX-20260201-05 */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMode}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors ml-2 ${mode === "PRODUCTION"
                ? "bg-red-900/30 border border-red-800 hover:bg-red-900/50"
                : "bg-blue-900/30 border border-blue-800 hover:bg-blue-900/50"
                }`}
              title="Clic para cambiar modo"
            >
              <span className={`w-2 h-2 rounded-full ${mode === "PRODUCTION" ? "bg-red-500 animate-pulse" : "bg-blue-400"}`} />
              <span className="font-bold tracking-wider">{mode === "PRODUCTION" ? "PROD" : "DEMO"}</span>
            </button>

            {/* Botón Configuración */}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-1 text-[#6e6e6e] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="Configuración"
              >
                ⚙️
              </button>
            )}
          </div>
        )}

        {/* Separador */}
        <div className="w-px h-4 bg-[#3c3c3c]" />

        {/* Usuario y Admin */}
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-[#6e6e6e]">{user.nombre}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${user.role === 'SUPER_ADMIN' ? 'bg-purple-600 text-white' :
              user.role === 'ADMIN' ? 'bg-blue-600 text-white' :
                'bg-[#3c3c3c] text-[#cccccc]'
              }`}>
              {user.role === 'SUPER_ADMIN' ? '👑' : user.role === 'ADMIN' ? '🔑' : '👤'}
            </span>
            <button
              onClick={logout}
              className="text-[#6e6e6e] hover:text-[#cccccc] transition-colors"
              title="Cerrar sesión"
            >
              ↪
            </button>
          </div>
        ) : (
          <button
            onClick={onAdminClick}
            className="px-2 py-1 bg-[#2a2a2a] hover:bg-[#3c3c3c] text-[#cccccc] rounded text-xs font-medium transition-colors flex items-center gap-1"
          >
            <span>🔐</span> Admin
          </button>
        )}
        {/* Botón Minimizar - ARCH-20260130-02 */}
        <button
          onClick={() => window.colorManager.minimizarVentana()}
          className="ml-2 w-6 h-6 flex items-center justify-center text-[#6e6e6e] hover:text-[#cccccc] hover:bg-[#3c3c3c] rounded transition-all"
          title="Minimizar (Alt+Tab para volver)"
        >
          <span className="text-lg leading-none">−</span>
        </button>
      </div>
    </header>
  )
}
