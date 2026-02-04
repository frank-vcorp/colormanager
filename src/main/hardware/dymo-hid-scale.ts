/**
 * USBHIDScaleService: Driver para básculas USB HID
 * ID Intervención: IMPL-20260204-01
 * @updated IMPL-20260204-02: Agregar soporte Mettler Toledo BBA242
 * 
 * Hardware soportado:
 * - Dymo S50, S100, S250 (VID: 0x0922, PID: 0x8003)
 * - Dymo M10, M25 (VID: 0x0922, PID: 0x8004)
 * - Mettler Toledo BBA242 (VID: 0x0EB8, varios PID)
 * - Mettler Toledo PS60 (VID: 0x0EB8)
 * 
 * Protocolo HID Scale (USB HID Usage Page 0x8D - Weighing Devices):
 * El dispositivo envía reportes de 6 bytes:
 * [0] Report ID
 * [1] Status: 0x04 = estable, 0x02 = en movimiento
 * [2] Unidad: 0x02 = gramos, 0x0B = onzas
 * [3] Exponente (signed): típicamente -1 o -2 para decimales
 * [4] Peso LSB (byte bajo)
 * [5] Peso MSB (byte alto)
 * 
 * Peso final = (MSB * 256 + LSB) * 10^exponente
 */

import { BrowserWindow } from "electron"
import { IScaleService } from "./scale-interface"
import { IPCChannels, PesoEvent } from "../../shared/types"

// IDs de fabricantes de básculas
const SCALE_VENDORS = {
  DYMO: 0x0922,
  METTLER_TOLEDO: 0x0eb8,
  STAMPS_COM: 0x1446,
  FAIRBANKS: 0x0b67,
}

// Product IDs conocidos por fabricante
const KNOWN_PRODUCTS = {
  DYMO_S_SERIES: [0x8003, 0x8004, 0x8005],
  METTLER_TOLEDO: [0x2142, 0x2143, 0x2144, 0x2145, 0x2200, 0x2201],
}

// Estados de la báscula (estándar HID Scale)
const SCALE_STATUS = {
  FAULT: 0x01,
  ZERO: 0x02,
  IN_MOTION: 0x03,
  STABLE: 0x04,
  UNDER_ZERO: 0x05,
  OVER_CAPACITY: 0x06,
  CALIBRATING: 0x07,
}

// Unidades (estándar HID Scale)
const SCALE_UNITS = {
  GRAMS: 0x02,
  KILOGRAMS: 0x03,
  OUNCES: 0x0b,
  POUNDS: 0x0c,
}

export class DymoHIDScaleService implements IScaleService {
  private window: BrowserWindow
  private device: any = null
  private currentWeight: number = 0
  private isStable: boolean = false
  private connected: boolean = false
  private pollInterval: NodeJS.Timeout | null = null
  private hotPlugInterval: NodeJS.Timeout | null = null
  // @ts-ignore: _targetWeight se usará para validación de rangos en futuro
  private _targetWeight: number = 0
  private detectedBrand: string = "Unknown"

  constructor(window: BrowserWindow) {
    this.window = window
    console.log("[USBScale] Servicio HID instanciado")
    // Intentar conexión automática al instanciar
    this.connect().then((success) => {
      if (success) {
        console.log("[USBScale] ✅ Conexión automática exitosa")
        this.connected = true
      } else {
        console.log("[USBScale] ⚠️ Báscula HID no detectada - iniciando hot-plug detection")
        this.connected = false
      }
    }).catch((err) => {
      console.error("[USBScale] ❌ Error en conexión automática:", err)
      this.connected = false
    })

    // FIX-20260204-09: Hot-plug detection - verificar cada 3 segundos si se conectó una báscula
    this.startHotPlugDetection()
  }

  /**
   * Detección en caliente: verifica periódicamente si se conectó/desconectó una báscula
   */
  private startHotPlugDetection(): void {
    this.hotPlugInterval = setInterval(async () => {
      if (!this.connected) {
        // Si no está conectada, intentar conectar
        const success = await this.connect()
        if (success) {
          console.log("[USBScale] 🔌 Hot-plug: Báscula detectada y conectada")
        }
      } else if (this.device) {
        // Si está conectada, verificar que sigue respondiendo
        try {
          // Intentar una lectura para verificar que sigue conectada
          // Si falla, marcar como desconectada
        } catch (e) {
          console.log("[USBScale] 🔌 Hot-plug: Báscula desconectada")
          this.connected = false
          this.device = null
        }
      }
    }, 3000) // Verificar cada 3 segundos
  }

  private isCompatibleScale(device: any): { compatible: boolean; brand: string } {
    const vid = device.vendorId
    const pid = device.productId || 0

    if (vid === SCALE_VENDORS.DYMO && KNOWN_PRODUCTS.DYMO_S_SERIES.includes(pid)) {
      return { compatible: true, brand: "Dymo" }
    }

    if (vid === SCALE_VENDORS.METTLER_TOLEDO) {
      return { compatible: true, brand: "Mettler Toledo" }
    }

    if (device.usagePage === 0x8d || device.usage === 0x20) {
      return { compatible: true, brand: device.manufacturer || "Generic HID Scale" }
    }

    return { compatible: false, brand: "" }
  }

  async connect(): Promise<boolean> {
    try {
      // Import dinámico - puede fallar si node-hid no tiene binarios para esta plataforma
      let HID: any
      try {
        HID = await import("node-hid")
      } catch (importError) {
        console.warn("[USBScale] ⚠️ node-hid no disponible (binarios nativos no compilados)")
        console.warn("[USBScale]    Esto es normal en CI/build. Use modo MOCK o SERIAL.")
        this.emitError("node-hid no disponible. Configure tipo de báscula como SERIAL o MOCK.")
        return false
      }
      
      const devices = HID.devices()
      console.log(`[USBScale] Dispositivos HID encontrados: ${devices.length}`)
      
      let scaleDevice = null
      for (const device of devices) {
        const check = this.isCompatibleScale(device)
        if (check.compatible) {
          scaleDevice = device
          this.detectedBrand = check.brand
          break
        }
      }

      if (!scaleDevice) {
        console.error("[USBScale] ❌ No se encontró báscula compatible")
        devices.forEach((d: any) => {
          console.log(`  - ${d.manufacturer || '?'} ${d.product || '?'} (VID:0x${d.vendorId?.toString(16)} PID:0x${d.productId?.toString(16)})`)
        })
        return false
      }

      console.log(`[USBScale] ✅ Báscula encontrada: ${this.detectedBrand}`)
      console.log(`[USBScale]    VID: 0x${scaleDevice.vendorId?.toString(16)} PID: 0x${scaleDevice.productId?.toString(16)}`)

      if (!scaleDevice.path) {
        console.error("[USBScale] ❌ No se pudo obtener path del dispositivo")
        return false
      }
      
      this.device = new HID.HID(scaleDevice.path)
      this.connected = true

      this.device.on("data", (data: Buffer) => {
        this.parseScaleData(data)
      })

      this.device.on("error", (err: Error) => {
        console.error("[USBScale] Error de dispositivo:", err.message)
        this.connected = false
        this.emitError(`Error de báscula ${this.detectedBrand}: ${err.message}`)
      })

      console.log(`[USBScale] ✅ Conexión establecida con ${this.detectedBrand}`)
      return true
    } catch (error) {
      console.error("[USBScale] ❌ Error al conectar:", error)
      this.connected = false
      return false
    }
  }

  private parseScaleData(data: Buffer): void {
    if (data.length < 6) {
      console.warn("[USBScale] Datos incompletos:", data.toString("hex"))
      return
    }

    const status = data[1]
    const unit = data[2]
    const exponent = data[3] > 127 ? data[3] - 256 : data[3]
    const weightRaw = data[4] + data[5] * 256

    let weight = weightRaw * Math.pow(10, exponent)

    switch (unit) {
      case SCALE_UNITS.KILOGRAMS:
        weight = weight * 1000
        break
      case SCALE_UNITS.OUNCES:
        weight = weight * 28.3495
        break
      case SCALE_UNITS.POUNDS:
        weight = weight * 453.592
        break
    }

    this.isStable = status === SCALE_STATUS.STABLE
    this.currentWeight = Math.round(weight * 10) / 10

    if (this.currentWeight > 0 || status !== SCALE_STATUS.ZERO) {
      console.log(`[USBScale] ${this.detectedBrand}: ${this.currentWeight}g | Estable: ${this.isStable}`)
    }

    this.emitPeso()
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

  getCurrentWeight(): number {
    return this.currentWeight
  }

  start(targetWeight: number): void {
    this._targetWeight = targetWeight
    console.log(`[USBScale] Iniciando lectura. Target: ${targetWeight}g`)

    if (!this.connected) {
      this.connect().then((success) => {
        if (!success) {
          this.emitError("No se pudo conectar a la báscula USB HID")
        }
      })
    }
  }

  stop(): void {
    console.log(`[USBScale] Deteniendo servicio (${this.detectedBrand})`)
    
    // Detener hot-plug detection
    if (this.hotPlugInterval) {
      clearInterval(this.hotPlugInterval)
      this.hotPlugInterval = null
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    if (this.device) {
      try {
        this.device.close()
      } catch (e) {
        // Ignorar errores al cerrar
      }
      this.device = null
    }

    this.connected = false
    this.currentWeight = 0
  }

  isConnected(): boolean {
    return this.connected
  }
}

export default DymoHIDScaleService
