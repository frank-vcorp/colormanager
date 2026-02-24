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
  private parser: any = null
  private currentWeight: number = 0
  private isStable: boolean = false
  private connected: boolean = false
  private portPath: string
  private baudRate: number
  private pollInterval: NodeJS.Timeout | null = null
  // @ts-ignore
  private _targetWeight: number = 0
  private mode: "SICS" | "CONTINUOUS" = "CONTINUOUS"

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
    try {
      const { SerialPort } = await import("serialport")
      const { ReadlineParser } = await import("@serialport/parser-readline")

      console.log(`[MettlerSerial] Conectando a ${this.portPath}...`)

      const configService = require('../services/configService').configService
      const currentConfig = configService.getConfig()

      this.port = new SerialPort({
        path: currentConfig.hardware.scalePort || this.portPath,
        baudRate: currentConfig.hardware.baudRate || this.baudRate,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen: false,
      })

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: "\r\n" }))

      this.parser.on("data", (line: string) => {
        this.parseScaleData(line)
      })

      this.port.on("error", (err: Error) => {
        console.error("[MettlerSerial] Error:", err.message)
        this.connected = false
        this.emitError(`Error Mettler Toledo: ${err.message}`)
      })

      return new Promise((resolve) => {
        this.port.open((err: Error | null) => {
          if (err) {
            console.error(`[MettlerSerial] ❌ Error al abrir ${this.portPath}:`, err.message)
            resolve(false)
          } else {
            console.log(`[MettlerSerial] ✅ Conectado a ${this.portPath}`)
            this.connected = true
            if (this.mode === "SICS") this.startPolling()
            resolve(true)
          }
        })
      })
    } catch (error) {
      console.error("[MettlerSerial] ❌ Error:", error)
      return false
    }
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

  getCurrentWeight(): number { return this.currentWeight }

  start(targetWeight: number): void {
    this._targetWeight = targetWeight
    console.log(`[MettlerSerial] Target: ${targetWeight}g`)
    // FIX-20260224-01: Validar estado real del puerto antes de reconectar
    if (!this.connected || (this.port && !this.port.isOpen)) {
      console.log(`[MettlerSerial] Intentando reconectar a ${this.portPath}...`)
      this.connect().then((success) => {
        if (!success) this.emitError(`No se pudo conectar a ${this.portPath}`)
      })
    } else {
      console.log(`[MettlerSerial] Puerto ${this.portPath} ya abierto, activando lectura (Polling).`)
      if (this.mode === "SICS") this.startPolling()
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
