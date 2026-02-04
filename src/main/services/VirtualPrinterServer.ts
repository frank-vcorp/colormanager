/**
 * VirtualPrinterServer: Servidor TCP para interceptar impresiones "Raw"
 * 
 * Simula una impresora en red escuchando en un puerto (ej. 9100).
 * El software de Sayer se configura para imprimir en una impresora
 * "ColorManager Printer" conectada a 127.0.0.1:9100.
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

    // ARCH-20260130-04: Estados y Cola
    private state: PrinterState = "IDLE"
    private jobQueue: PrintJob[] = []
    private MAX_QUEUE_SIZE = 10

    constructor(mainWindow: BrowserWindow, config: PrinterServerConfig) {
        this.mainWindow = mainWindow
        this.port = config.port
        this.name = config.name
    }

    /**
     * Inicia el servidor TCP
     */
    public start(): void {
        this.stop()

        this.server = net.createServer((socket) => {
            console.log(`[PrinterServer] Conexión recibida desde ${socket.remoteAddress}`)
            this.updateState("RECEIVING")

            socket.on("data", (data) => {
                this.buffer += data.toString("latin1")
                if (this.timeout) clearTimeout(this.timeout)

                this.timeout = setTimeout(() => {
                    this.processInboundPrint()
                }, 800)
            })

            socket.on("end", () => {
                if (this.timeout) clearTimeout(this.timeout)
                this.processInboundPrint()
            })

            socket.on("error", (err) => {
                console.error("[PrinterServer] Error en socket:", err)
                this.updateState("ERROR")
            })
        })

        this.server.listen(this.port, "0.0.0.0", () => {
            console.log(`[PrinterServer] ✅ "${this.name}" activo en 0.0.0.0:${this.port} (escuchando todas las interfaces)`)
            this.updateState("IDLE")
        })

        this.server.on("error", (err) => {
            console.error("[PrinterServer] Error en servidor:", err)
            this.updateState("ERROR")
            this.sendError(`Error en Impresora Virtual: ${err.message}`)
        })
    }

    public stop(): void {
        if (this.server) {
            this.server.close()
            this.server = null
        }
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
