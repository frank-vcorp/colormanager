/**
 * Sayer Spool Watcher y Parser de Recetas
 * Detecta archivos de impresión del sistema Sayer, los parsea y envía al Renderer
 *
 * ID Intervención: IMPL-20260127-02
 */

import fs from "fs"
import path from "path"
import { watch } from "chokidar"
import { BrowserWindow } from "electron"
import { IPCChannels, RecetaSayer } from "../../shared/types"
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
  }

  /**
   * Inicia el watcher en la carpeta de spool
   */
  public start(): void {
    // Crear carpeta si no existe
    if (!fs.existsSync(this.spoolDir)) {
      fs.mkdirSync(this.spoolDir, { recursive: true })
      console.log(`[SayerService] Creada carpeta: ${this.spoolDir}`)
    }

    // Iniciar watcher
    this.watcher = watch(this.spoolDir, {
      ignored: /(^|[/\\])\.|\.tmp$/,
      awaitWriteFinish: {
        stabilityThreshold: this.debounceMs,
        pollInterval: 100,
      },
    })

    this.watcher.on("add", (filePath: string) => {
      console.log(`[SayerService] Archivo detectado: ${filePath}`)
      this.handleFileAdd(filePath)
    })

    this.watcher.on("error", (error: any) => {
      console.error(`[SayerService] Error en watcher:`, error)
      this.sendError(`Error en Sayer Watcher: ${error.message}`)
    })

    console.log(`[SayerService] Iniciado - monitoreando: ${this.spoolDir}`)
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
      // FIX DEBY-01: Lectura asíncrona y con encoding flexible (latin1 para legacy apps)
      const content = await fs.promises.readFile(filePath, "latin1")
      console.log(`[SayerService] Leyendo archivo (Latin1): ${filePath}`)

      const receta = this.parseReceta(content)

      if (receta) {
        console.log(`[SayerService] Receta parseada:`, receta)
        this.sendRecetaToRenderer(receta)
      } else {
        this.sendError(`No se pudo parsear la receta: ${path.basename(filePath)}`)
      }
    } catch (error: any) {
      console.error(`[SayerService] Error procesando archivo:`, error)
      this.sendError(`Error leyendo archivo Sayer: ${error.message}`)
    }
  }

  /**
   * Parsea el contenido del archivo según SPEC-SAYER-PARSER
   */
  private parseReceta(content: string): RecetaSayer | null {
    const lines = content.split("\n").map((line) => line.trimEnd())

    // Extraer número de receta
    const numeroMatch = content.match(/Número\s*:\s*(\w+)/i)
    const numero = numeroMatch?.[1] || "000"

    // Extraer historia
    const historiaMatch = content.match(/HISTORIA\s*:\s*(\w+)/i)
    const historia = historiaMatch?.[1] || "F"

    // Extraer metadatos
    const carMakerMatch = content.match(/Car Maker\s*:\s*(.+?)(?:\n|$)/i)
    const colorCodeMatch = content.match(/Color Code\s*:\s*(.+?)(?:\n|$)/i)
    const sayerCodeMatch = content.match(/Sayer Code\s*:\s*(.+?)(?:\n|$)/i)
    const coatingTypeMatch = content.match(/Coating Type\s*:\s*(.+?)(?:\n|$)/i)
    const primerMatch = content.match(/Primer\s*:\s*(.+?)(?:\n|$)/i)

    const meta = {
      carMaker: carMakerMatch?.[1]?.trim(),
      colorCode: colorCodeMatch?.[1]?.trim(),
      sayerCode: sayerCodeMatch?.[1]?.trim(),
      coatingType: coatingTypeMatch?.[1]?.trim(),
      primer: primerMatch?.[1]?.trim(),
    }

    // Parsear capas
    const capas = this.parseCapas(lines)

    if (capas.length === 0) {
      console.warn("[SayerService] No se encontraron capas en la receta")
      return null
    }

    return {
      numero,
      historia,
      capas,
      meta,
    }
  }

  /**
   * Parsea las secciones de capas y sus ingredientes
   */
  private parseCapas(lines: string[]): RecetaSayer["capas"] {
    const capas: RecetaSayer["capas"] = []
    let currentCapa: (typeof capas)[0] | null = null
    let readingIngredients = false

    // FIX DEBY-02: RegEx Robusta (Soporta minúsculas, comas decimales y variaciones de unidades)
    // Ej: "01 : kt-1400  323,0 g" o "01 : KT_1400 323.0(gr)"
    const ingredientRegex = /^\s*(\d+)\s*:\s*([A-Za-z0-9_-]+)\s+(\d+[.,]?\d*)\s*(?:\(g(?:r)?\)|g(?:r)?)?/i

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Detectar inicio de capa
      if (line.match(/Primera capa|Segunda capa|Tercera capa/i)) {
        if (currentCapa) {
          capas.push(currentCapa)
        }
        currentCapa = {
          nombre: line.trim(),
          ingredientes: [],
        }
        readingIngredients = true
        continue
      }

      // Detectar fin de lectura de ingredientes (línea de Total)
      if (line.match(/^\s*Total\s+/i)) {
        readingIngredients = false
      }

      // Parsear ingredientes
      if (readingIngredients && currentCapa) {
        const match = line.match(ingredientRegex)
        if (match) {
          const [, orden, sku, peso] = match
          currentCapa.ingredientes.push({
            orden: parseInt(orden, 10),
            sku: sku.trim(),
            pesoMeta: parseFloat(peso),
          })
        }
      }
    }

    // Agregar última capa
    if (currentCapa) {
      capas.push(currentCapa)
    }

    return capas
  }

  /**
   * Envía la receta al Renderer vía IPC
   */
  private sendRecetaToRenderer(receta: RecetaSayer): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return
    }

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
