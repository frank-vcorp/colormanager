/**
 * IScaleService: Interfaz de abstracción para servicios de báscula
 * ID Intervención: IMPL-20260129-01
 * @updated FIX-20260129-01: Ajustar imports para compilación
 * Respaldo: context/SPEC-CONFIG-DINAMICA.md
 */

import type { BrowserWindow } from "electron"
// FIX-20260129-01: PesoEvent se usará cuando se implemente comunicación real
// import { PesoEvent } from "../../shared/types"

export interface IScaleService {
  /**
   * Obtener peso actual
   */
  getCurrentWeight(): number

  /**
   * Iniciar simulación/lectura con peso meta
   */
  start(targetWeight: number): void

  /**
   * Detener simulación/lectura
   */
  stop(): void

  /**
   * Obtener estado de conexión
   */
  isConnected(): boolean
}

/**
 * PlaceholderSerialScaleService: Preparado para conexión real COM
 * Por ahora solo logea intenciones de conexión
 * ID Intervención: IMPL-20260129-01
 * @updated FIX-20260129-01: Prefijo _ para variables reservadas para uso futuro
 */
export class SerialScaleService implements IScaleService {
  private _port: string
  private _baudRate: number
  // @ts-ignore: _window se usará cuando se implemente envío de eventos al renderer
  private _window: BrowserWindow
  private connected: boolean = false
  private currentWeight: number = 0

  constructor(
    window: BrowserWindow,
    port: string,
    baudRate: number = 9600
  ) {
    this._window = window
    this._port = port
    this._baudRate = baudRate
    console.log(
      `[SerialScaleService] Instancia creada. Puerto: ${port}, BaudRate: ${baudRate}`
    )
  }

  getCurrentWeight(): number {
    return this.currentWeight
  }

  start(targetWeight: number): void {
    console.log(
      `[SerialScaleService] Intentaría conectar a ${this._port} (${this._baudRate} baud). Target: ${targetWeight}g`
    )
    console.log(
      "[SerialScaleService] SerialPort real aún no implementado. Disponible en Fase 2."
    )
    // TODO: Implementar conexión real con SerialPort cuando se requiera en producción
    // import SerialPort from "serialport"
    // this.port = new SerialPort({ path: this.port, baudRate: this.baudRate })
    // this.port.on("data", (data) => { ... })
  }

  stop(): void {
    console.log("[SerialScaleService] Deteniendo...")
    // TODO: Cerrar puerto serial
  }

  isConnected(): boolean {
    return this.connected
  }
}
