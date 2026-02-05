/**
 * printingIPC.ts
 * Handlers IPC para gestión de impresión física (Zebra, Brother, Reportes)
 * ID Intervención: FIX-20260205-01
 * 
 * Reemplaza window.print() con una implementación robusta controlada por Electron
 */

import { ipcMain, BrowserWindow, WebContents } from "electron"
import { IPCChannels, IPCInvokeChannels, PrintOptions, PrinterInfo } from "../../shared/types"

/**
 * Registrar handlers de impresión
 */
export function registerPrintingIPC(mainWindow?: BrowserWindow) {

    /**
     * GET_PRINTERS: Obtener lista de impresoras disponibles
     */
    ipcMain.handle(IPCInvokeChannels.GET_PRINTERS, async () => {
        try {
            if (!mainWindow || mainWindow.isDestroyed()) {
                throw new Error("Ventana principal no disponible")
            }

            const contents = mainWindow.webContents
            const printers = await contents.getPrintersAsync()

            // Mapear a formato compartido
            const mappedPrinters: PrinterInfo[] = printers.map(p => ({
                name: p.name,
                displayName: p.displayName,
                description: p.description,
                status: p.status,
                isDefault: p.isDefault,
                options: p.options
            }))

            console.log(`[PrintingIPC] ${mappedPrinters.length} impresoras encontradas`)
            return { success: true, data: mappedPrinters }
        } catch (error) {
            console.error("[PrintingIPC] Error obteniendo impresoras:", error)
            return { success: false, error: String(error) }
        }
    })

    /**
     * PRINT_LABEL: Imprimir contenido actual (o específico)
     * Se asume que el contenido a imprimir ya está renderizado o se imprime la ventana actual.
     * Para etiquetas, lo ideal es imprimir en modo "silencioso".
     */
    ipcMain.handle(IPCInvokeChannels.PRINT_LABEL, async (_, options: PrintOptions) => {
        try {
            if (!mainWindow || mainWindow.isDestroyed()) {
                throw new Error("Ventana principal no disponible")
            }

            console.log(`[PrintingIPC] Solicitud de impresión. Device: ${options.printerName || 'Default'}, Silent: ${options.silent}`)

            const contents = mainWindow.webContents

            // Configuración de impresión
            const printSettings: Electron.WebContentsPrintOptions = {
                silent: options.silent ?? true, // Por defecto silencioso si no se especifica
                printBackground: true,
                deviceName: options.printerName, // Si es undefined, usa default
                copies: options.copies || 1,
                // Márgenes mínimos para etiquetas
                margins: {
                    marginType: 'custom',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                }
            }

            // Ejecutar impresión
            await new Promise<void>((resolve, reject) => {
                contents.print(printSettings, (success, errorType) => {
                    if (!success) {
                        console.error(`[PrintingIPC] Fallo de impresión: ${errorType}`)
                        reject(new Error(errorType || "Fallo desconocido de impresión"))
                    } else {
                        console.log("[PrintingIPC] Impresión enviada correctamente")
                        resolve()
                    }
                })
            })

            return { success: true }
        } catch (error) {
            console.error("[PrintingIPC] Error imprimiendo:", error)
            return { success: false, error: String(error) }
        }
    })
}
