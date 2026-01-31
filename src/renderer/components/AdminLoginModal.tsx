/**
 * AdminLoginModal Component
 * Modal para autenticación de Admin/SuperAdmin
 * 
 * ID Intervención: ARCH-20260130-01
 * 
 * Uso: Desde modo Entonador, permite elevar privilegios temporalmente
 */

import React, { useState } from 'react'
import { useAuth } from '../context/AuthProvider'

interface AdminLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(username, password)
    
    if (result.success) {
      setUsername('')
      setPassword('')
      onSuccess?.()
      onClose()
    } else {
      setError(result.error || 'Credenciales inválidas')
    }
    
    setLoading(false)
  }

  const handleClose = () => {
    setUsername('')
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
          <h2 className="text-[#cccccc] font-medium">🔐 Acceso Administrativo</h2>
          <button
            onClick={handleClose}
            className="text-[#6e6e6e] hover:text-[#cccccc] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Usuario */}
          <div>
            <label htmlFor="admin-username" className="block text-xs font-medium text-[#6e6e6e] mb-1">
              Usuario
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              disabled={loading}
              autoFocus
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium text-[#6e6e6e] mb-1">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 bg-red-900/30 border border-red-700 text-red-300 rounded text-xs">
              ⚠️ {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-[#cccccc] rounded text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
            >
              {loading ? '...' : 'Ingresar'}
            </button>
          </div>
        </form>

        {/* Footer hint */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-[#4e4e4e] text-center">
            Solo usuarios Admin o Super Admin pueden acceder
          </p>
        </div>
      </div>
    </div>
  )
}
