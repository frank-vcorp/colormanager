/**
 * useToast Hook
 * Contexto de React para gestionar notificaciones (toasts)
 * Proporciona métodos: success(), error(), info(), warning()
 * 
 * ID Intervención: IMPL-20260127-06
 * FIX REFERENCE: FIX-20260127-03 - Renombrado de .ts a .tsx (contiene JSX)
 */

import { createContext, useContext, useState, useCallback } from "react"
import { ToastMessage } from "../components/ui/Toast"

interface ToastContextType {
  toasts: ToastMessage[]
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback(
    (type: "success" | "error" | "info" | "warning", message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const newToast: ToastMessage = { id, type, message, duration }

      setToasts((prev) => [...prev, newToast])
      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  const value: ToastContextType = {
    toasts,
    success: (message, duration) => addToast("success", message, duration),
    error: (message, duration) => addToast("error", message, duration),
    info: (message, duration) => addToast("info", message, duration),
    warning: (message, duration) => addToast("warning", message, duration),
    removeToast,
    clearAll,
  }

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider")
  }
  return context
}
