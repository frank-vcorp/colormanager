/**
 * Definiciones de tipos para APIs de Electron (IPC)
 * Reemplaza tipos genéricos `any` con tipos específicos de @shared/types
 * 
 * ID Intervención: IMPL-20260127-06
 * @see /src/shared/types.ts para interfaces compartidas
 */

import { PesoEvent, RecetaSayer, RegistroMezcla, Producto } from "@shared/types"

declare global {
  interface Window {
    colorManager: {
      // Listeners (Renderer recibe cambios desde Main)
      onPesoActualizado: (callback: (evento: PesoEvent) => void) => void
      onRecetaDetectada: (callback: (receta: RecetaSayer) => void) => void
      onEstadoBascula: (
        callback: (estado: { conectada: boolean; peso: number }) => void
      ) => void
      onError: (callback: (error: Error | string) => void) => void

      // Acciones (Renderer invoca Main)
      iniciarMezcla: (recetaId: string) => Promise<void>
      cancelarMezcla: () => Promise<void>
      guardarMezcla: (registro: RegistroMezcla) => Promise<RegistroMezcla>
      obtenerHistorial: () => Promise<RegistroMezcla[]>
      obtenerInventario: () => Promise<Producto[]>
      resetearInventario: () => Promise<Producto[]>
      tara?: () => Promise<void> // Opcional para báscula
    }
  }
}
