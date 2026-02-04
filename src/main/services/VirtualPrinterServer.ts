/**
 * VirtualPrinterServer: Servidor TCP para interceptar impresiones "Raw"
 * 
 * Simula una impresora en red escuchando en un puerto (ej. 9100).
 * El software de Sayer se configura para imprimir en una impresora
 * "ColorManager Printer" conectada a 127.0.0.1:9100.
 * 
 * FIX-20260204-10: Escuchar en 127.0.0.1 en lugar de 0.0.0.0 para Windows
 */

import net from "net"
import { BrowserWindow } from "electron"
import { IPCChannels, RecetaSayer, PrinterStatus, PrintJob, PrinterState } from "../../shared/types"
import { SayerParser } from "./SayerParser"
import { v4 as uuidv4 } from "uuid"

export interface PrinterServerConfig {
    port: number
    name: string
}

export class VirtualPrinterServer {
    private server: net.Server | null = null
    private mainWindow: BrowserWindow
    private port: number
    private name: string
    private buffer: string = ""
    private timeout: NodeJS.Timeout | null = null
    private isListening: boolean = false

    // ARCH-20260130-04: Estados y Cola
    private state: PrinterState = "IDLE"
    private jobQueue: PrintJob[] = []
    private MAX_QUEUE_SIZE = 10

    constructor(mainWindow: BrowserWindow, config: PrinterServerConfig) {
        this.mainWindow = mainWindow
        this.port = config.port
        this.name = config.name
        console.log(`[PrinterServer] Constructor llamado - puerto: ${this.port}`)
    }

    /**
     * Inicia el servidor TCP
     */
    public start(): void {
        console.log(`[PrinterServer] Iniciando servidor en puerto ${this.port}...`)
        this.stop()

        try {
            this.server = net.createServer((socket) => {
                const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`
                console.log(`[PrinterServer] ✅ CONEXIÓN RECIBIDA desde ${clientAddr}`)
                this.updateState("RECEIVING")

                socket.on("data", (data) => {
                    console.log(`[PrinterServer] Datos recibidos: ${data.length} bytes`)
                    this.buffer += data.toString("latin1")
                    if (this.timeout) clearTimeout(this.timeout)

                    this.timeout = setTimeout(() => {
                        this.processInboundPrint()
                    }, 800)
                })

                socket.on("end", () => {
                    console.log(`[PrinterServer] Socket cerrado por cliente ${clientAddr}`)
                    if (this.timeout) clearTimeout(this.timeout)
                    this.processInboundPrint()
                })

                socket.on("error", (err) => {
                    console.error("[PrinterServer] Error en socket:", err)
                    this.updateState("ERROR")
                })
            })

            // FIX-20260204-10: Escuchar en 127.0.0.1 para compatibilidad con Windows
            // La impresora TCP de Windows envía a 127.0.0.1, no a 0.0.0.0
            this.server.listen(this.port, "127.0.0.1", () => {
                this.isListening = true
                console.log(`[PrinterServer] ✅✅✅ "${this.name}" ACTIVO en 127.0.0.1:${this.port}`)
                console.log(`[PrinterServer] Servidor listo para recibir impresiones`)
                this.updateState("IDLE")
            })

            this.server.on("error", (err: NodeJS.ErrnoException) => {
                this.isListening = false
                console.error(`[PrinterServer] ❌ ERROR AL INICIAR SERVIDOR:`, err.message)
                
                if (err.code === "EADDRINUSE") {
                    console.error(`[PrinterServer] ❌ El puerto ${this.port} ya está en uso por otro proceso`)
                    this.sendError(`Puerto ${this.port} ocupado. Cierre el proceso que lo usa e intente de nuevo.`)
                } else if (err.code === "EACCES") {
                    console.error(`[PrinterServer] ❌ Sin permisos para escuchar en puerto ${this.port}`)
                    this.sendError(`Sin permisos para puerto ${this.port}. Ejecute como administrador.`)
                } else {
                    this.sendError(`Error en Impresora Virtual: ${err.message}`)
                }
                
                this.updateState("ERROR")
            })

            this.server.on("close", () => {
                this.isListening = false
                console.log(`[PrinterServer] Servidor cerrado`)
            })

        } catch (err: any) {
            console.error(`[PrinterServer] ❌ Excepción al crear servidor:`, err)
            this.sendError(`No se pudo crear servidor: ${err.message}`)
        }
    }

    public stop(): void {
        if (this.server) {
            console.log(`[PrinterServer] Deteniendo servidor...`)
            this.server.close()
            this.server = null
            this.isListening = false
        }
    }

    public getIsListening(): boolean {
        return this.isListening
    }

    private updateState(newState: PrinterState): void {
        this.state = newState
        this.broadcastStatus()
    }

    private broadcastStatus(): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return
        const status: PrinterStatus = {
            state: this.state,
            lastSync: new Date().toISOString(),
            jobsCount: this.jobQueue.length
        }
        this.mainWindow.webContents.send(IPCChannels.PRINTER_STATUS, status)
        this.mainWindow.webContents.send(IPCChannels.PRINTER_QUEUE, this.jobQueue)
    }

    private processInboundPrint(): void {
        if (!this.buffer.trim()) {
            this.updateState("IDLE")
            return
        }

        this.updateState("PROCESSING")
        console.log(`[PrinterServer] Procesando impresión (${this.buffer.length} bytes)`)

        const jobId = uuidv4()
        const timestamp = new Date().toISOString()
        const contentPreview = this.buffer.substring(0, 100).replace(/\n/g, " ")

        try {
            const receta = SayerParser.parse(this.buffer)

            const newJob: PrintJob = {
                id: jobId,
                timestamp,
                size: this.buffer.length,
                status: receta ? "SUCCESS" : "FAILED",
                preview: contentPreview,
                recetaNumero: receta?.numero
            }

            this.addJobToQueue(newJob)

            if (receta) {
                console.log(`[PrinterServer] Receta detectada:`, receta.numero)
                this.sendRecetaToRenderer(receta)
            }
        } catch (err: any) {
            console.error("[PrinterServer] Error parseando impresión:", err)
            this.addJobToQueue({
                id: jobId,
                timestamp,
                size: this.buffer.length,
                status: "FAILED",
                preview: contentPreview
            })
        } finally {
            this.buffer = ""
            this.updateState("IDLE")
        }
    }

    private addJobToQueue(job: PrintJob): void {
        this.jobQueue.unshift(job)
        if (this.jobQueue.length > this.MAX_QUEUE_SIZE) {
            this.jobQueue.pop()
        }
        this.broadcastStatus()
    }

    private sendRecetaToRenderer(receta: RecetaSayer): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return
        if (this.mainWindow.isMinimized()) this.mainWindow.restore()
        this.mainWindow.show()
        this.mainWindow.focus()
        this.mainWindow.setAlwaysOnTop(true)
        setTimeout(() => this.mainWindow.setAlwaysOnTop(false), 1000)
        this.mainWindow.webContents.send(IPCChannels.RECETA_DETECTADA, receta)
    }

    private sendError(message: string): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return
        this.mainWindow.webContents.send(IPCChannels.ERROR, { message })
    }
}
