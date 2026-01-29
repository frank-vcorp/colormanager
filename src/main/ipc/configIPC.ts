/**
 * IPC Handlers para Configuración Dinámica
 * ID Intervención: IMPL-20260129-01
 * Respaldo: context/SPEC-CONFIG-DINAMICA.md
 */

import { ipcMain, BrowserWindow } from "electron"
import { configService, AppConfig } from "../services/configService"
import { IPCChannels, IPCInvokeChannels } from "../../shared/types"

/**
 * Registrar todos los handlers de configuración
 */
export function registerConfigIPC(mainWindow?: BrowserWindow) {
  /**
   * config:get - Obtener configuración actual
   */
  ipcMain.handle(IPCInvokeChannels.CONFIG_GET, async () => {
    try {
      const config = configService.getConfig()
      console.log("[IPC] config:get ->", config)
      return { success: true, config }
    } catch (error) {
      console.error("[IPC] Error en config:get:", error)
      return { success: false, error: String(error) }
    }
  })

  /**
   * config:set - Guardar nueva configuración
   * Si cambia el modo, emite evento CONFIG_CHANGED para que el renderer sepa recargar
   */
  ipcMain.handle(
    IPCInvokeChannels.CONFIG_SET,
    async (_, newConfig: Partial<AppConfig>) => {
      try {
        const oldConfig = configService.getConfig()
        const updated = configService.setConfig(newConfig)

        console.log("[IPC] config:set ->", updated)

        // Si cambió el modo o los paths, notificar al renderer
        if (
          oldConfig.mode !== updated.mode ||
          oldConfig.paths.sayerSpoolDir !== updated.paths.sayerSpoolDir ||
          oldConfig.hardware.scalePort !== updated.hardware.scalePort
        ) {
          console.log("[IPC] Configuración cambió. Enviando CONFIG_CHANGED...")
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPCChannels.CONFIG_CHANGED, {
              oldConfig,
              newConfig: updated,
            })
          }
        }

        return { success: true, config: updated }
      } catch (error) {
        console.error("[IPC] Error en config:set:", error)
        return { success: false, error: String(error) }
      }
    }
  )

  /**
   * config:setMode - Cambiar modo rápidamente
   */
  ipcMain.handle(
    IPCInvokeChannels.CONFIG_SET_MODE,
    async (_, mode: "DEMO" | "PRODUCTION") => {
      try {
        const updated = configService.setMode(mode)
        console.log("[IPC] config:setMode ->", mode)

        // Notificar cambio
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPCChannels.CONFIG_CHANGED, {
            mode,
          })
        }

        return { success: true, config: updated }
      } catch (error) {
        console.error("[IPC] Error en config:setMode:", error)
        return { success: false, error: String(error) }
      }
    }
  )

  /**
   * config:reset - Resetear a valores por defecto
   */
  ipcMain.handle(IPCInvokeChannels.CONFIG_RESET, async () => {
    try {
      const reset = configService.reset()
      console.log("[IPC] config:reset")
      return { success: true, config: reset }
    } catch (error) {
      console.error("[IPC] Error en config:reset:", error)
      return { success: false, error: String(error) }
    }
  })
}
