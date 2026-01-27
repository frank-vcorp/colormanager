/**
 * Modal Component
 * Sistema de diálogos modales centrados con fondo difuminado (backdrop blur)
 * Reemplaza window.confirm() y window.alert()
 * 
 * ID Intervención: IMPL-20260127-06
 */

import { useState, useCallback, createContext, useContext } from "react"

export interface ModalOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: "confirm" | "alert"
  isDangerous?: boolean // Rojo si es peligroso (ej: reset)
}

interface ModalContextType {
  confirm: (options: Omit<ModalOptions, "type">) => Promise<boolean>
  alert: (title: string, message: string) => Promise<void>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

interface ModalState extends ModalOptions {
  type: "confirm" | "alert"
  isOpen: boolean
  promise?: {
    resolve: (value: boolean) => void
    reject: (error: Error) => void
  }
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    title: "",
    message: "",
    type: "confirm",
    isOpen: false,
  })

  const confirm = useCallback((options: Omit<ModalOptions, "type">): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      setModal({
        ...options,
        type: "confirm",
        isOpen: true,
        promise: { resolve, reject },
      })
    })
  }, [])

  const alert = useCallback((title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      setModal({
        title,
        message,
        type: "alert",
        isOpen: true,
        promise: {
          resolve: () => {
            setModal((prev) => ({ ...prev, isOpen: false }))
            resolve()
          },
          reject: () => {},
        },
      })
    })
  }, [])

  const handleConfirm = () => {
    modal.promise?.resolve(true)
    setModal((prev) => ({ ...prev, isOpen: false }))
  }

  const handleCancel = () => {
    modal.promise?.resolve(false)
    setModal((prev) => ({ ...prev, isOpen: false }))
  }

  const handleAlertClose = () => {
    modal.promise?.resolve(true)
    setModal((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop blur */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={handleCancel}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 z-10">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{modal.title}</h2>
            <p className="text-gray-700 mb-6">{modal.message}</p>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              {modal.type === "confirm" && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  {modal.cancelText || "Cancelar"}
                </button>
              )}
              <button
                onClick={modal.type === "alert" ? handleAlertClose : handleConfirm}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-white ${
                  modal.isDangerous
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {modal.confirmText || (modal.type === "alert" ? "Aceptar" : "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}

export function useModal(): ModalContextType {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModal debe usarse dentro de ModalProvider")
  }
  return context
}
