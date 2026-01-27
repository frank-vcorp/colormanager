/**
 * Mock Scale Service
 * Emula una báscula Mettler Toledo emitiendo pesos cada 100ms
 * 
 * ID Intervención: IMPL-20260127-01
 */

import { BrowserWindow } from "electron"
import { PesoEvent, IPCChannels } from "@shared/types"

export class MockScaleService {
  private isRunning = false
  private currentWeight = 0
  private targetWeight = 0
  private interval: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow | null = null

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
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
