/**
 * MettlerToledoSerialService: Driver para básculas Mettler Toledo via RS232/USB-Serial
 * ID Intervención: IMPL-20260204-03
 * 
 * Hardware soportado:
 * - Mettler Toledo BBA242 (paint shop scale)
 * - Mettler Toledo PS60, ICS series
 * 
 * Protocolo MT-SICS y Toledo Continuous soportados.
 * @updated FIX-20260224-01: Prevenir bloqueo de puerto COM (Access Denied) al iniciar mezcla.
 */

import { BrowserWindow } from "electron"
import { IScaleService } from "./scale-interface"
import { IPCChannels, PesoEvent } from "../../shared/types"

const MT_SICS_REGEX = /^([SD])\s+([SI+\-])\s+([\d\.\-]+)\s*(\w+)?/
const CONTINUOUS_REGEX = /^(?:ST,)?(?:GS,)?\s*([\d\.\-]+)\s*(\w+)?/
const SIMPLE_WEIGHT_REGEX = /([\d\.\-]+)\s*(g|kg|oz|lb)?/i

export class MettlerToledoSerialService implements IScaleService {
  private window: BrowserWindow
  private port: any = null
  private currentWeight: number = 0
  private isStable: boolean = false
  private connected: boolean = false
  private portPath: string
  private baudRate: number
  private pollInterval: NodeJS.Timeout | null = null
  // @ts-ignore
  private _targetWeight: number = 0
  private mode: "SICS" | "CONTINUOUS" = "CONTINUOUS"
  private isConnecting: boolean = false
  private connectionPromise: Promise<boolean> | null = null

  constructor(window: BrowserWindow, portPath: string = "COM3", baudRate: number = 9600) {
    this.window = window
    this.portPath = portPath
    this.baudRate = baudRate
    console.log(`[MettlerSerial] Puerto: ${portPath}, BaudRate: ${baudRate}`)
    // Intentar conexión automática al instanciar (FIX-20260224-01: Evitar si ya está conectado)
    this.connect().then((success) => {
      if (success) {
        console.log("[MettlerSerial] ✅ Conexión automática exitosa")
      } else {
        console.log("[MettlerSerial] ⚠️ Puerto serial no disponible - se reintentará al iniciar mezcla")
      }
    })
  }

  async connect(): Promise<boolean> {
    if (this.isConnecting && this.connectionPromise) {
      console.log(`[MettlerSerial] Conexión ya en progreso para ${this.portPath}, esperando...`)
      return this.connectionPromise
    }
    if (this.connected && this.port && this.port.isOpen) {
      return Promise.resolve(true)
    }

    this.isConnecting = true
    this.connectionPromise = (async () => {
      try {
        this.emitDiag(`PASO1:importando serialport...`)
        const { SerialPort } = await import("serialport")
        this.emitDiag(`PASO2:serialport importado OK`)

        const configService = require('../services/configService').configService
        const currentConfig = configService.getConfig()
        const portPath = currentConfig.hardware.scalePort || this.portPath
        const baudRate = currentConfig.hardware.baudRate || this.baudRate
        this.emitDiag(`PASO3:config -> ${portPath}@${baudRate}`)

        // Cerrar puerto anterior si existía
        if (this.port && this.port.isOpen) {
          try { this.port.close() } catch (e) { }
        }

        this.emitDiag(`PASO4:creando SerialPort...`)
        this.port = new SerialPort({
          path: portPath,
          baudRate,
          dataBits: 8,
          parity: "none",
          stopBits: 1,
          autoOpen: false,
        })
        this.emitDiag(`PASO5:SerialPort creado OK`)

        // Raw buffer acumulador
        let rxBuf = ""
        this.port.on("data", (chunk: Buffer) => {
          rxBuf += chunk.toString("ascii")
          const lines = rxBuf.split(/[\r\n]+/)
          rxBuf = lines.pop() ?? ""
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed) {
              this.emitDiag(`DATO:${trimmed}`)
              this.parseScaleData(trimmed)
            }
          }
        })

        this.port.on("error", (err: Error) => {
          this.connected = false
          this.emitDiag(`ERR_PORT:${err.message}`)
        })

        this.emitDiag(`PASO6:abriendo puerto...`)
        return new Promise<boolean>((resolve) => {
          this.port.open((err: Error | null) => {
            this.isConnecting = false
            if (err) {
              this.emitDiag(`FALLO_OPEN:${err.message}`)
              resolve(false)
            } else {
              this.connected = true
              this.emitDiag(`OK_COM:${portPath}@${baudRate}`)
              if (this.mode === "SICS") this.startPolling()
              resolve(true)
            }
          })
        })
      } catch (error: any) {
        const msg = error?.message || String(error)
        console.error("[MettlerSerial] ❌ Error catch:", msg)
        this.emitDiag(`CRASH:${msg}`)
        this.isConnecting = false
        return false
      }
    })()

    return this.connectionPromise
  }

  private startPolling(): void {
    if (this.pollInterval) return
    this.pollInterval = setInterval(() => {
      if (this.port && this.connected) {
        this.port.write("SI\r\n")
      }
    }, 200)
  }

  private parseScaleData(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) return

    let weight: number | null = null
    let stable = false

    const sicsMatch = trimmed.match(MT_SICS_REGEX)
    if (sicsMatch) {
      stable = sicsMatch[1] === "S"
      weight = parseFloat(sicsMatch[3])
      weight = this.convertToGrams(weight, sicsMatch[4]?.toLowerCase())
    }

    if (weight === null) {
      const contMatch = trimmed.match(CONTINUOUS_REGEX)
      if (contMatch) {
        weight = parseFloat(contMatch[1])
        weight = this.convertToGrams(weight, contMatch[2]?.toLowerCase())
        stable = trimmed.includes("ST")
      }
    }

    if (weight === null) {
      const simpleMatch = trimmed.match(SIMPLE_WEIGHT_REGEX)
      if (simpleMatch) {
        weight = parseFloat(simpleMatch[1])
        weight = this.convertToGrams(weight, simpleMatch[2]?.toLowerCase())
        stable = true
      }
    }

    if (weight !== null && !isNaN(weight)) {
      this.currentWeight = Math.round(weight * 10) / 10
      this.isStable = stable
      this.emitPeso()
    }
  }

  private convertToGrams(weight: number, unit?: string): number {
    if (!unit) return weight
    switch (unit) {
      case "kg": return weight * 1000
      case "oz": return weight * 28.3495
      case "lb": return weight * 453.592
      default: return weight
    }
  }

  private emitPeso(): void {
    if (!this.window || this.window.isDestroyed()) return
    const evento: PesoEvent = {
      peso: this.currentWeight,
      timestamp: Date.now(),
      estable: this.isStable,
    }
    this.window.webContents.send(IPCChannels.PESO_ACTUALIZADO, evento)
  }

  private emitError(message: string): void {
    if (!this.window || this.window.isDestroyed()) return
    this.window.webContents.send(IPCChannels.ERROR, message)
  }

  // FIX-20260224-07: Diagnóstico via canal ERROR proven con prefijo [DIAG]
  private emitDiag(message: string): void {
    if (!this.window || this.window.isDestroyed()) return
    this.window.webContents.send(IPCChannels.ERROR, `[DIAG] ${message}`)
  }

  getCurrentWeight(): number { return this.currentWeight }

  start(targetWeight: number): void {
    this._targetWeight = targetWeight
    console.log(`[MettlerSerial] Target: ${targetWeight}g`)
    this.emitDiag(`START target=${targetWeight}g mode=${this.mode} connected=${this.connected} isConnecting=${this.isConnecting}`)

    const pending = this.isConnecting && this.connectionPromise
      ? this.connectionPromise
      : null

    if (pending) {
      this.emitDiag(`WAIT:conexion en progreso...`)
      pending.then((success) => {
        if (success) {
          this.emitDiag(`OK:conexion pendiente exitosa`)
          if (this.mode === "SICS") this.startPolling()
        } else {
          this.emitDiag(`FALLO:conexion pendiente falló`)
          this.emitError(`No se pudo conectar a ${this.portPath}`)
        }
      })
    } else if (this.connected && this.port?.isOpen) {
      this.emitDiag(`YA_CONECTADO:${this.portPath} isOpen=true - esperando datos`)
      if (this.mode === "SICS") this.startPolling()
    } else {
      this.emitDiag(`RECONECTANDO:${this.portPath} connected=${this.connected} portOpen=${this.port?.isOpen}`)
      this.connect().then((success) => {
        if (success) {
          this.emitDiag(`OK:reconexion exitosa`)
        } else {
          this.emitDiag(`FALLO:reconexion falló`)
          this.emitError(`No se pudo conectar a ${this.portPath}`)
        }
      })
    }
  }

  stop(): void {
    console.log("[MettlerSerial] Deteniendo")
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    if (this.port?.isOpen) {
      try { this.port.close() } catch (e) { }
    }
    this.port = null
    this.connected = false
    this.currentWeight = 0
  }

  isConnected(): boolean { return this.connected }

  static async listPorts(): Promise<string[]> {
    try {
      const { SerialPort } = await import("serialport")
      const ports = await SerialPort.list()
      return ports.map((p) => p.path)
    } catch { return [] }
  }
}

export default MettlerToledoSerialService
