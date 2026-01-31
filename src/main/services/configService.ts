/**
 * ConfigService: Gestión de configuración dinámica (DEMO vs PROD) usando electron-store
 * ID Intervención: IMPL-20260129-01
 * @updated FIX-20260129-01: Agregar EventEmitter para reinicio dinámico de servicio de báscula
 * Respaldo: context/SPEC-CONFIG-DINAMICA.md
 */

import Store from "electron-store"
import path from "path"
import { app } from "electron"
import { EventEmitter } from "events"
import { AppConfig } from "../../shared/types"


/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG: AppConfig = {
  mode: "DEMO",
  hardware: {
    scalePort: "COM3",
    baudRate: 9600,
  },
  paths: {
    sayerSpoolDir: path.join(process.cwd(), "sayer_spool"),
    printerPort: 9100,
  },
}

/**
 * ConfigService: Singleton para gestionar la configuración persistente
 * FIX-20260129-01: Extiende EventEmitter para notificar cambios de configuración
 */
class ConfigService extends EventEmitter {
  private store: Store<AppConfig>
  private currentConfig: AppConfig

  constructor() {
    super()
    // Inicializar Store con electron-store
    this.store = new Store<AppConfig>({
      name: "app-config",
      defaults: DEFAULT_CONFIG,
      cwd: app.getPath("userData"),
    })

    // Cargar configuración actual (get el objeto completo)
    const storedConfig = this.store.store as any
    this.currentConfig = storedConfig || { ...DEFAULT_CONFIG }
    console.log(`[ConfigService] Inicializado. Modo: ${this.currentConfig.mode}`)
  }

  /**
   * Obtener configuración actual
   */
  public getConfig(): AppConfig {
    return { ...this.currentConfig }
  }

  /**
   * Actualizar configuración y persistir
   * FIX-20260129-01: Emite evento 'config-changed' para reiniciar servicios
   */
  public setConfig(config: Partial<AppConfig>): AppConfig {
    const oldConfig = { ...this.currentConfig }
    this.currentConfig = {
      ...this.currentConfig,
      ...config,
    }
    // FIX-20260129-01: electron-store v8 API compatible con CommonJS
    this.store.set(this.currentConfig)
    console.log(`[ConfigService] Configuración actualizada. Modo: ${this.currentConfig.mode}`)
    // FIX-20260129-01: Emitir evento para reinicio de servicios
    this.emit("config-changed", { oldConfig, newConfig: this.currentConfig })
    return { ...this.currentConfig }
  }

  /**
   * Obtener solo el modo actual
   */
  public getMode(): "DEMO" | "PRODUCTION" {
    return this.currentConfig.mode
  }

  /**
   * Establecer modo (DEMO o PRODUCTION)
   */
  public setMode(mode: "DEMO" | "PRODUCTION"): AppConfig {
    return this.setConfig({ mode })
  }

  /**
   * Obtener configuración de hardware
   */
  public getHardwareConfig() {
    return { ...this.currentConfig.hardware }
  }

  /**
   * Actualizar configuración de hardware
   */
  public setHardwareConfig(
    hardware: Partial<AppConfig["hardware"]>
  ): AppConfig {
    return this.setConfig({
      hardware: {
        ...this.currentConfig.hardware,
        ...hardware,
      },
    })
  }

  /**
   * Obtener rutas
   */
  public getPathsConfig() {
    return { ...this.currentConfig.paths }
  }

  /**
   * Actualizar rutas
   */
  public setPathsConfig(paths: Partial<AppConfig["paths"]>): AppConfig {
    return this.setConfig({
      paths: {
        ...this.currentConfig.paths,
        ...paths,
      },
    })
  }

  /**
   * Resetear a valores por defecto
   */
  public reset(): AppConfig {
    this.currentConfig = { ...DEFAULT_CONFIG }
    // FIX-20260129-01: electron-store v8 API compatible con CommonJS
    this.store.clear()
    this.store.set(this.currentConfig)
    console.log("[ConfigService] Configuración reseteada a valores por defecto")
    return { ...this.currentConfig }
  }
}

// Exportar singleton
export const configService = new ConfigService()
export default ConfigService
