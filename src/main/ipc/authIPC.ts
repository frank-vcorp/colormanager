/**
 * IMPL-20260128-01: AuthIPC - Canales de Comunicación Electron para Autenticación
 * Ref: context/SPEC-SEGURIDAD-LOGIN.md (ARCH-20260128-04)
 * 
 * Expone:
 * - auth:login (invoke)
 * - auth:logout (send)
 * - auth:check (invoke)
 */

import { ipcMain } from 'electron'
import AuthService, { UserSession } from '../services/authService'

// Almacén de sesiones en memoria (Main process)
const activeSessions = new Map<string, UserSession>()
let currentSessionId: string | null = null

/**
 * Registra todos los handlers IPC de autenticación
 */
export function registerAuthIPC(): void {
  /**
   * auth:login - Valida credenciales e inicia sesión
   * Response: { success: boolean, user?: UserSession, error?: string }
   */
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    try {
      const user = await AuthService.login(username, password)
      
      if (!user) {
        return { success: false, error: 'Credenciales inválidas' }
      }

      // Generar ID de sesión simple
      const sessionId = `session_${user.id}_${Date.now()}`
      activeSessions.set(sessionId, user)
      currentSessionId = sessionId

      console.log(`[AuthIPC] ✅ Login exitoso: ${user.username} (${user.role})`)

      return { success: true, user, sessionId }
    } catch (error) {
      console.error('[AuthIPC] Error en auth:login:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  })

  /**
   * auth:logout - Cierra la sesión actual
   */
  ipcMain.on('auth:logout', (_event) => {
    if (currentSessionId) {
      activeSessions.delete(currentSessionId)
      currentSessionId = null
      console.log('[AuthIPC] ✅ Logout exitoso')
    }
  })

  /**
   * auth:check - Verifica si hay sesión activa
   * Response: { user?: UserSession, sessionId?: string }
   */
  ipcMain.handle('auth:check', async (_event) => {
    if (currentSessionId && activeSessions.has(currentSessionId)) {
      const user = activeSessions.get(currentSessionId)!
      return { user, sessionId: currentSessionId }
    }
    return { user: null, sessionId: null }
  })
}

/**
 * Exporta funciones para limpiar sesión si es necesario
 */
export function getCurrentSession(): UserSession | null {
  return currentSessionId && activeSessions.has(currentSessionId)
    ? activeSessions.get(currentSessionId) || null
    : null
}

export function clearAllSessions(): void {
  activeSessions.clear()
  currentSessionId = null
  console.log('[AuthIPC] Todas las sesiones cerradas')
}
