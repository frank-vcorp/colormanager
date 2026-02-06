/**
 * printingIPC.ts
 * Handlers IPC para gestión de impresión física (Zebra, Brother, Reportes)
 * ID Intervención: FIX-20260205-01
 * 
 * Reemplaza window.print() con una implementación robusta controlada por Electron
 */

import { ipcMain, BrowserWindow } from "electron"
import { IPCInvokeChannels, PrintOptions, PrinterInfo } from "../../shared/types"

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
                status: (p as any).status || 0, // Castear a any por posible discrepancia de tipos
                isDefault: (p as any).isDefault || false,
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
    /**
     * PRINT_LABEL: Imprimir usando una ventana oculta dedicada
     * Crea una instancia BrowserWindow invisible, carga la vista de etiqueta y ejecuta print.
     */
    /**
     * PRINT_LABEL: Imprimir usando una ventana oculta dedicada
     * Crea una instancia BrowserWindow invisible, carga la vista de etiqueta y ejecuta print.
     */
    ipcMain.handle(IPCInvokeChannels.PRINT_LABEL, async (_, options: PrintOptions) => {
        let printWindow: BrowserWindow | null = null

        try {
            console.log(`[PrintingIPC] Solicitud de impresión dedicada. Devi: ${options.printerName || 'Default'}`)

            // 1. Crear ventana oculta de tamaño exacto
            printWindow = new BrowserWindow({
                show: false, // IMPORTANTE: Invisible
                width: 250,  // ~66mm
                height: 150, // ~40mm
                webPreferences: {
                    nodeIntegration: true, // Necesario si usa imports
                    contextIsolation: false
                }
            })

            // 2. Construir URL con parámetros
            // BASE_URL depende de dev/prod. Si mainWindow existe, usamos su base.
            let baseURL = ""
            if (mainWindow) {
                const mainURL = mainWindow.webContents.getURL()
                // Extraer base (file://.../index.html o http://localhost:5173)
                // Si es file://, termina en index.html. Si es localhost, termina en /.
                if (mainURL.includes("index.html")) {
                    baseURL = mainURL.split("#")[0] // file://.../index.html
                } else {
                    baseURL = mainURL.split("#")[0].replace(/\/$/, "") // http://localhost:5173
                }
            } else {
                // Fallback si no hay mainWindow (raro)
                throw new Error("No se pudo determinar Base URL para ventana de impresión")
            }

            const params = new URLSearchParams()

            // Usar datos tipados de PrintOptions
            if (options.data) {
                params.set("sku", options.data.sku || "")
                params.set("nombre", options.data.nombre || "")
                if (options.data.lote) {
                    params.set("lote", options.data.lote.numero || "")
                    if (options.data.lote.fecha) {
                        params.set("fechaLote", options.data.lote.fecha)
                    }
                }
            }

            // FIX-20260206-02: Usar Query Param ?mode=print en lugar de Hash
            // Agregar mode=print para que App.tsx detecte y renderice solo la etiqueta
            params.set("mode", "print")

            // Asegurar separador correcto (? o &)
            const separator = baseURL.includes("?") ? "&" : "?"
            const printUrl = `${baseURL}${separator}${params.toString()}`

            console.log(`[PrintingIPC] Cargando ventana oculta: ${printUrl}`)

            await printWindow.loadURL(printUrl)

            // 3. Imprimir
            const contents = printWindow.webContents

            const printSettings: Electron.WebContentsPrintOptions = {
                silent: options.silent ?? true,
                printBackground: true,
                deviceName: options.printerName,
                copies: options.copies || 1,
                margins: {
                    marginType: 'none'
                },
                // FIX-20260206-05: Forzar tamaño de papel en micras (50mm x 30mm)
                // Electron usa micras para tamaños personalizados: 1mm = 1000 micras
                pageSize: { width: 50000, height: 30000 }
            }

            console.log("[PrintingIPC] Enviando trabajo a driver...")

            await new Promise<void>((resolve, reject) => {
                // Esperar un poco a que renderice React
                setTimeout(() => {
                    contents.print(printSettings, (success, errorType) => {
                        if (!success) {
                            console.error(`[PrintingIPC] Fallo de impresión: ${errorType}`)
                            reject(new Error(errorType || "Fallo desconocido"))
                        } else {
                            console.log("[PrintingIPC] Éxito enviando a cola")
                            resolve()
                        }
                    })
                }, 500) // 500ms buffer para renderizado de barcode
            })

            return { success: true }
        } catch (error) {
            console.error("[PrintingIPC] Error imprimiendo:", error)
            return { success: false, error: String(error) }
        } finally {
            // 4. Limpieza
            if (printWindow && !printWindow.isDestroyed()) {
                printWindow.close()
            }
        }
    })
}
