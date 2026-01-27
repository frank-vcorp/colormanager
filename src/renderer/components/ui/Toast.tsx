/**
 * Toast Component
 * Sistema de notificaciones no-intrusivas en esquina superior derecha
 * Tailwind + Animaciones suaves
 * 
 * ID Intervención: IMPL-20260127-06
 */

import { useEffect, useState } from "react"
import { useToast } from "../../hooks/useToast"

export interface ToastMessage {
  id: string
  type: "success" | "error" | "info" | "warning"
  message: string
  duration?: number // ms, 0 = indefinido
}

const iconMap = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
}

const colorMap = {
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  info: "bg-blue-500 text-white",
  warning: "bg-yellow-500 text-white",
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage
  onRemove: (id: string) => void
}) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (!toast.duration || toast.duration === 0) return

    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(toast.id), 300) // Espera animación de salida
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? "translate-x-96 opacity-0" : "translate-x-0 opacity-100"}
        px-4 py-3 rounded-lg shadow-lg flex items-center gap-3
        ${colorMap[toast.type]}
      `}
    >
      <span className="text-lg font-bold">{iconMap[toast.type]}</span>
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  )
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  )
}
