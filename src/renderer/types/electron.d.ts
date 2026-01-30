/**
 * Definiciones de tipos para APIs de Electron (IPC)
 * Reemplaza tipos genéricos `any` con tipos específicos de @shared/types
 * 
 * ID Intervención: IMPL-20260127-06 + IMPL-20260127-10
 * @updated IMPL-20260129-01: Agregar tipos para configuración dinámica
 * @see /src/shared/types.ts para interfaces compartidas
 */

import { PesoEvent, RecetaSayer, RegistroMezcla, Producto, ImportacionResultado, SyncResponse, AjusteStockParams, AjusteStockResponse, AuthResponse, AppConfig } from "@shared/types"

declare global {
  interface Window {
    colorManager: {
      // Listeners (Renderer recibe cambios desde Main)
      onPesoActualizado: (callback: (evento: PesoEvent) => void) => (() => void) | void
      onRecetaDetectada: (callback: (receta: RecetaSayer) => void) => (() => void) | void
      onEstadoBascula: (
        callback: (estado: { conectada: boolean; peso: number }) => void
      ) => (() => void) | void
      onError: (callback: (error: Error | string) => void) => (() => void) | void
      // IMPL-20260129-01: Listener para cambios de configuración
      onConfigChanged: (
        callback: (data: { oldConfig?: AppConfig; newConfig?: AppConfig; mode?: string }) => void
      ) => (() => void) | void

      // Acciones (Renderer invoca Main)
      iniciarMezcla: (recetaId: string) => Promise<void>
      cancelarMezcla: () => Promise<void>
      guardarMezcla: (registro: RegistroMezcla) => Promise<RegistroMezcla>
      obtenerHistorial: () => Promise<RegistroMezcla[]>
      obtenerInventario: () => Promise<Producto[]>
      resetearInventario: () => Promise<Producto[]>
      importarInventarioCSV: () => Promise<{ success: boolean; error?: string; data?: ImportacionResultado }>
      sincronizarInventario: () => Promise<SyncResponse>
      ajustarStock: (params: AjusteStockParams) => Promise<AjusteStockResponse>
      tara?: () => Promise<void> // Opcional para báscula
      
      // Auth
      login: (username: string, pass: string) => Promise<AuthResponse>
      logout: () => Promise<void>
      checkAuth: () => Promise<AuthResponse>

      // IMPL-20260129-01: Métodos genéricos para IPC
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }

  // Alias para acceso directo desde SettingsView
  interface Window {
    electron?: Window["colorManager"]
  }
}

export {}
