/**
 * IMPL-20260128-01: AuthProvider - Contexto de Autenticación
 * Ref: context/SPEC-SEGURIDAD-LOGIN.md (ARCH-20260128-04)
 * @updated ARCH-20260130-01: Permitir acceso sin login para Entonador
 * 
 * Proporciona:
 * - useAuth() hook para acceder al usuario actual y roles
 * - Lógica de login/logout
 * - Modo "invitado" para entonadores sin login
 * - Persistencia de sesión en memoria durante la sesión
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserRole } from '@shared/types'

export interface User {
  id: number
  username: string
  nombre: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
  isSuperAdmin: boolean
  isGuest: boolean // Entonador sin login
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Al montar, verificar si hay sesión activa
   * ARCH-20260130-01: No bloquear si no hay sesión, permitir modo invitado
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await (window as any).colorManager.checkAuth()
        if (result.user) {
          setUser(result.user)
        }
        // Si no hay sesión, user queda null (modo invitado/entonador)
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
   * Logout - Volver a modo invitado
   */
  const logout = () => {
    try {
      (window as any).colorManager.logout()
      setUser(null)
    } catch (error) {
      console.error('[AuthProvider] Error in logout:', error)
    }
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isGuest = user === null // Entonador sin login

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSuperAdmin, isGuest }}>
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
