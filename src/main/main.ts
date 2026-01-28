/**
 * Main Process (Electron)
 * Gestiona ventana, IPC, hardware y base de datos
 * 
 * ID Intervención: IMPL-20260127-02 + IMPL-20260127-08 (Persistencia Prisma) + IMPL-20260127-09 (Importador CSV)
 * @updated IMPL-20260128-01: Aplicar FIX-20260127-04 para Electron en contenedor (ESM/CJS + GPU headless)
 * @see Checkpoints/IMPL-20260128-01-ElectronEnContenedor.md
 */

import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "path"
import { MockScaleService } from "./hardware/mock-scale"
import { SayerService } from "./services/sayer-service"
import { IPCChannels, IPCInvokeChannels } from "../shared/types"
// FIX REFERENCE: FIX-20260127-04 - Cambio de @shared/ a ruta relativa para compatibilidad tsc
import { seedInitialInventory, getAllProducts, resetInventory } from "./database/inventoryService"
import { closePrismaClient } from "./database/db"
import { importarSicar } from "./services/importService"

let mainWindow: BrowserWindow | null = null
let scaleService: MockScaleService | null = null
let sayerService: SayerService | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // FIX REFERENCE: FIX-20260127-04 - Cambiado a .cjs para compatibilidad ESM
      preload: path.join(__dirname, "ipc/preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Requerido en contenedor sin SUID sandbox
    },
  })

  const isDevelopment = process.env.NODE_ENV === "development"
  const startUrl = isDevelopment
    ? "http://localhost:5173" // Vite dev server
    : `file://${path.join(__dirname, "../renderer/index.html")}` // Production build

  mainWindow.loadURL(startUrl)

  if (isDevelopment) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on("closed", () => {
    mainWindow = null
    if (scaleService) {
      scaleService.stop()
    }
    if (sayerService) {
      sayerService.stop()
    }
  })

  // Inicializar Mock Scale Service
  scaleService = new MockScaleService(mainWindow)

  // Inicializar Sayer Service
  sayerService = new SayerService(mainWindow, {
    spoolDir: path.join(process.cwd(), "sayer_spool"),
    debounceMs: 500,
  })
  sayerService.start()

  // Inicializar persistencia: sembrar inventario si está vacío
  seedInitialInventory()
    .then(() => console.log("[Main] Inventario inicializado"))
    .catch((err) => console.error("[Main] Error al inicializar inventario:", err))

  // Emitir estado de báscula cada segundo
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPCChannels.ESTADO_BASCULA, {
        conectada: true, // Simulado siempre conectado
        peso: scaleService?.getCurrentWeight() || 0,
      })
    }
  }, 1000)
}

// Handlers para IPC Invoke
ipcMain.handle(IPCInvokeChannels.GET_SESION_ACTUAL, async () => {
  // Por ahora retornar dummy
  return null
})

ipcMain.handle(IPCInvokeChannels.INICIAR_MEZCLA, async (_, _recetaId: string) => {
  // Iniciar simulación de peso con target 150g
  if (scaleService) {
    scaleService.start(150)
  }
  return { success: true, sesionId: "SESION-001" }
})

ipcMain.handle(IPCInvokeChannels.REGISTRAR_PESO, async (_, peso: number) => {
  return { success: true, pesoRegistrado: peso }
})

ipcMain.handle(IPCInvokeChannels.CANCELAR_MEZCLA, async () => {
  if (scaleService) {
    scaleService.stop()
  }
  return { success: true }
})

ipcMain.handle(IPCInvokeChannels.SIGUIENTE_INGREDIENTE, async () => {
  return { success: true }
})

// ==================== HANDLERS DE INVENTARIO (IMPL-20260127-08 + IMPL-20260127-10) ====================

/**
 * OBTENER_INVENTARIO: Retorna todos los productos con stock actual desde la BD
 */
ipcMain.handle(IPCInvokeChannels.OBTENER_INVENTARIO, async () => {
  try {
    console.log("[IPC] Solicitud: OBTENER_INVENTARIO")
    const productos = await getAllProducts()
    console.log(`[IPC] Retornando ${productos.length} productos`)
    return { success: true, data: productos }
  } catch (error) {
    console.error("[IPC] Error en OBTENER_INVENTARIO:", error)
    return { success: false, error: String(error) }
  }
})

/**
 * RESETEAR_INVENTARIO: Limpia la tabla y vuelve a sembrar con datos iniciales
 */
ipcMain.handle(IPCInvokeChannels.RESETEAR_INVENTARIO, async () => {
  try {
    console.log("[IPC] Solicitud: RESETEAR_INVENTARIO")
    await resetInventory()
    console.log("[IPC] Inventario reseteado exitosamente")
    return { success: true }
  } catch (error) {
    console.error("[IPC] Error en RESETEAR_INVENTARIO:", error)
    return { success: false, error: String(error) }
  }
})

/**
 * IMPORTAR_INVENTARIO_CSV: Abre diálogo para seleccionar archivo (CSV, XLS, XLSX) e importa
 * ID Intervención: IMPL-20260127-10
 */
ipcMain.handle(IPCInvokeChannels.IMPORTAR_INVENTARIO_CSV, async () => {
  try {
    console.log("[IPC] Solicitud: IMPORTAR_INVENTARIO_CSV")

    // Abrir diálogo nativo de selección de archivo
    const resultado = await dialog.showOpenDialog(mainWindow!, {
      title: "Importar Inventario de SICAR",
      filters: [
        { name: "Archivos de Inventario", extensions: ["csv", "xls", "xlsx"] },
        { name: "Archivos CSV", extensions: ["csv"] },
        { name: "Archivos Excel", extensions: ["xls", "xlsx"] },
        { name: "Todos los archivos", extensions: ["*"] },
      ],
      properties: ["openFile"],
    })

    // Si el usuario canceló
    if (resultado.canceled || resultado.filePaths.length === 0) {
      console.log("[IPC] Usuario canceló la selección de archivo")
      return { success: false, error: "Importación cancelada por el usuario" }
    }

    const filePath = resultado.filePaths[0]
    console.log(`[IPC] Archivo seleccionado: ${filePath}`)

    // Procesar la importación
    const importacionResultado = await importarSicar(filePath)

    console.log(
      `[IPC] Importación completada: ${importacionResultado.procesados} procesados, ` +
        `${importacionResultado.actualizados} actualizados, ${importacionResultado.creados} creados`
    )

    return {
      success: true,
      data: importacionResultado,
    }
  } catch (error) {
    console.error("[IPC] Error en IMPORTAR_INVENTARIO_CSV:", error)
    return { success: false, error: String(error) }
  }
})

// App lifecycle
app.on("ready", createWindow)

app.on("window-all-closed", () => {
  // Cerrar conexión a Prisma antes de salir
  closePrismaClient()
    .then(() => console.log("[Main] Prisma desconectado"))
    .catch((err) => console.error("[Main] Error al desconectar Prisma:", err))

  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})

export { mainWindow }
