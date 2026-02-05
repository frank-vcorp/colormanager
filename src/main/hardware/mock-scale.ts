/**
 * Mock Scale Service
 * Emula una báscula Mettler Toledo emitiendo pesos cada 100ms
 * 
 * ID Intervención: IMPL-20260127-01
 * @updated IMPL-20260129-01: Implementar IScaleService para abstracción de hardware
 */

import { BrowserWindow } from "electron"
import { PesoEvent, IPCChannels } from "../../shared/types"
import { IScaleService } from "./scale-interface"
// FIX REFERENCE: FIX-20260127-04

export class MockScaleService implements IScaleService {
  private isRunning = false
  private currentWeight = 0
  private targetWeight = 0
  private interval: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow | null = null
  // FIX REFERENCE: FIX-20260204-06 - Flag para distinguir fallback de modo DEMO intencional
  private isFallback: boolean = false

  constructor(mainWindow: BrowserWindow, isFallback: boolean = false) {
    this.mainWindow = mainWindow
    this.isFallback = isFallback
    if (isFallback) {
      console.log("[MockScale] ⚠️ Iniciado como fallback - reportará desconectado")
    }
  }

  /**
   * Inicia la simulación de peso
   * Incrementa gradualmente hasta alcanzar targetWeight
   */
  start(targetWeight: number = 150) {
    if (this.isRunning) return

    this.targetWeight = targetWeight
    this.currentWeight = 0
    this.isRunning = true

    this.interval = setInterval(() => {
      // Incremento gradual con variación aleatoria pequeña
      const increment = Math.random() * 2 + 0.5 // 0.5 a 2.5g
      this.currentWeight = Math.min(this.currentWeight + increment, this.targetWeight)

      const pesoEvent: PesoEvent = {
        peso: Math.round(this.currentWeight * 10) / 10, // 1 decimal
        timestamp: Date.now(),
        estable: this.currentWeight >= this.targetWeight - 0.5,
      }

      // Enviar al Renderer via IPC
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPCChannels.PESO_ACTUALIZADO, pesoEvent)
      }

      // Si alcanzamos el target, detener
      if (pesoEvent.estable) {
        this.stop()
      }
    }, 100) // Cada 100ms como se requiere
  }

  /**
   * Detiene la simulación
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isRunning = false
  }

  /**
   * Verifica si está conectado
   * FIX REFERENCE: FIX-20260204-06 - Retorna false si es fallback (HID/Serial falló)
   */
  isConnected(): boolean {
    // Si es fallback (fallo de HID/Serial), reportar desconectado honestamente
    // Si es modo DEMO intencional, reportar conectado para demostración
    return !this.isFallback
  }

  /**
   * Tara la báscula (resetea a 0)
   */
  tara() {
    this.currentWeight = 0
  }

  /**
   * Obtiene el peso actual
   */
  getCurrentWeight(): number {
    return Math.round(this.currentWeight * 10) / 10
  }

  /**
   * Verifica si está en ejecución
   */
  isActive(): boolean {
    return this.isRunning
  }
}
