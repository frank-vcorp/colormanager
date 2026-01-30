/**
 * IMPL-20260128-01: AuthProvider - Contexto de Autenticación
 * Ref: context/SPEC-SEGURIDAD-LOGIN.md (ARCH-20260128-04)
 * 
 * Proporciona:
 * - useAuth() hook para acceder al usuario actual y roles
 * - Lógica de login/logout
 * - Persistencia de sesión en memoria durante la sesión
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: number
  username: string
  nombre: string
  role: 'ADMIN' | 'OPERADOR'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Al montar, verificar si hay sesión activa
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // FIX: Usar window.colorManager en lugar de window.electron.ipcRenderer
        const result = await (window as any).colorManager.checkAuth()
        if (result.user) {
          setUser(result.user)
        }
      } catch (error) {
        console.error('[AuthProvider] Error checking auth:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  /**
   * Login
   */
  const login = async (username: string, password: string) => {
    try {
      // FIX: Usar window.colorManager en lugar de window.electron.ipcRenderer
      const result = await (window as any).colorManager.login(username, password)
      
      if (result.success) {
        setUser(result.user)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('[AuthProvider] Error in login:', error)
      return { success: false, error: 'Error interno' }
    }
  }

  /**
   * Logout
   */
  const logout = () => {
    try {
      // FIX: Usar window.colorManager en lugar de window.electron.ipcRenderer
      (window as any).colorManager.logout()
      setUser(null)
    } catch (error) {
      console.error('[AuthProvider] Error in logout:', error)
    }
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}
