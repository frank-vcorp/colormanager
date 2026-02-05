/**
 * Sayer Spool Watcher y Parser de Recetas
 * Detecta archivos de impresión del sistema Sayer, los parsea y envía al Renderer
 *
 * ID Intervención: IMPL-20260127-02
 * @updated FIX-20260204-13: Agregar logging detallado y mejorar detección
 */

import fs from "fs"
import path from "path"
import { watch } from "chokidar"
import { BrowserWindow } from "electron"
import { IPCChannels, RecetaSayer } from "../../shared/types"
import { SayerParser } from "./SayerParser"
// FIX REFERENCE: FIX-20260127-04

export interface SayerServiceConfig {
  spoolDir: string
  debounceMs: number
}

export class SayerService {
  private watcher: any = null
  private mainWindow: BrowserWindow
  private spoolDir: string
  private debounceMs: number
  private pendingFiles: Map<string, NodeJS.Timeout> = new Map()

  constructor(mainWindow: BrowserWindow, config: SayerServiceConfig) {
    this.mainWindow = mainWindow
    this.spoolDir = config.spoolDir
    this.debounceMs = config.debounceMs
    console.log(`[SayerService] Constructor - spoolDir: ${this.spoolDir}`)
  }

  /**
   * Inicia el watcher en la carpeta de spool
   */
  public start(): void {
    // Crear carpeta si no existe
    if (!fs.existsSync(this.spoolDir)) {
      fs.mkdirSync(this.spoolDir, { recursive: true })
      console.log(`[SayerService] ✅ Creada carpeta: ${this.spoolDir}`)
    }

    console.log(`[SayerService] Iniciando watcher en: ${this.spoolDir}`)

    // Iniciar watcher con opciones más permisivas para Windows
    this.watcher = watch(this.spoolDir, {
      ignored: /(^|[/\\])\.|\.tmp$/,
      persistent: true,
      ignoreInitial: true, // FIX-20260204-17: NO reprocesar archivos existentes al reiniciar
      awaitWriteFinish: {
        stabilityThreshold: this.debounceMs,
        pollInterval: 100,
      },
      usePolling: process.platform === "win32", // FIX-20260204-13: Usar polling en Windows
      interval: 500,
    })

    this.watcher.on("add", (filePath: string) => {
      console.log(`[SayerService] 📄 Archivo detectado: ${filePath}`)
      this.handleFileAdd(filePath)
    })

    this.watcher.on("change", (filePath: string) => {
      console.log(`[SayerService] 📝 Archivo modificado: ${filePath}`)
      this.handleFileAdd(filePath)
    })

    this.watcher.on("error", (error: any) => {
      console.error(`[SayerService] ❌ Error en watcher:`, error)
      this.sendError(`Error en Sayer Watcher: ${error.message}`)
    })

    this.watcher.on("ready", () => {
      console.log(`[SayerService] ✅ Watcher listo - monitoreando: ${this.spoolDir}`)
    })

    console.log(`[SayerService] Watcher configurado`)
  }

  /**
   * Detiene el watcher
   */
  public stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }

    // Cancelar timers pendientes
    for (const timer of this.pendingFiles.values()) {
      clearTimeout(timer)
    }
    this.pendingFiles.clear()

    console.log("[SayerService] Detenido")
  }

  /**
   * Maneja la detección de un nuevo archivo
   */
  private handleFileAdd(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase()
    if (ext !== ".txt" && ext !== ".prn") {
      return
    }

    // Aplicar debounce
    const existing = this.pendingFiles.get(filePath)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(() => {
      this.processFile(filePath)
      this.pendingFiles.delete(filePath)
    }, this.debounceMs)

    this.pendingFiles.set(filePath, timer)
  }

  /**
   * Procesa el archivo: lectura, parsing y envío al Renderer
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      console.log(`[SayerService] 📖 Leyendo archivo: ${filePath}`)
      const content = await fs.promises.readFile(filePath, "latin1")
      console.log(`[SayerService] Contenido (${content.length} bytes):`)
      console.log(`[SayerService] --- INICIO ---`)
      console.log(content.substring(0, 500))
      console.log(`[SayerService] --- FIN (truncado) ---`)

      const receta = SayerParser.parse(content)

      if (receta) {
        console.log(`[SayerService] ✅ Receta detectada: ${receta.numero}`)
        console.log(`[SayerService] Capas: ${receta.capas.length}`)
        receta.capas.forEach((capa, i) => {
          console.log(`[SayerService]   Capa ${i + 1}: ${capa.nombre} - ${capa.ingredientes.length} ingredientes`)
        })
        this.sendRecetaToRenderer(receta)
      } else {
        console.log(`[SayerService] ⚠️ Archivo no contiene receta válida`)
      }
    } catch (error: any) {
      console.error(`[SayerService] ❌ Error procesando archivo:`, error)
    }
  }

  /**
   * Envía la receta al Renderer vía IPC
   */
  private sendRecetaToRenderer(receta: RecetaSayer): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return
    }

    // Auto-abrir ventana al detectar receta
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    this.mainWindow.show()
    this.mainWindow.focus()
    this.mainWindow.setAlwaysOnTop(true)
    setTimeout(() => this.mainWindow.setAlwaysOnTop(false), 1000)

    this.mainWindow.webContents.send(IPCChannels.RECETA_DETECTADA, receta)
  }

  /**
   * Envía error al Renderer
   */
  private sendError(message: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return
    }

    this.mainWindow.webContents.send(IPCChannels.ERROR, { message })
  }
}
