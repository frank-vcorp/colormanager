/**
 * Main Process (Electron)
 * Gestiona ventana, IPC, hardware y base de datos
 * 
 * ID Intervención: IMPL-20260127-02 + IMPL-20260127-08 (Persistencia Prisma) + IMPL-20260127-09 (Importador CSV)
 * @updated IMPL-20260128-01: Aplicar FIX-20260127-04 para Electron en contenedor (ESM/CJS + GPU headless)
 * @updated FIX-20260128-02: Revertir preload a .js para compatibilidad CommonJS
 * @updated IMPL-20260128-03: Agregar handler SYNC_INVENTARIO para Micro-Sprint 10 (Sync Nube)
 * @updated IMPL-20260128-02: Agregar handler AJUSTAR_STOCK para Micro-Sprint 11 (Ajustes de Inventario)
 * @updated IMPL-20260129-01: Integrar ConfigService para Modo Demo/Prod dinámico
 * @updated FIX-20260129-01: Suscribirse a cambios de configuración para reiniciar servicio de báscula
 * Respaldo: context/interconsultas/DICTAMEN_FIX-20260127-04.md
 * @see Checkpoints/IMPL-20260128-01-ElectronEnContenedor.md
 */

import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "path"
import { MockScaleService } from "./hardware/mock-scale"
import { SerialScaleService, IScaleService } from "./hardware/scale-interface"
import { SayerService } from "./services/sayer-service"
import { IPCChannels, IPCInvokeChannels, AjusteStockParams } from "../shared/types"
// FIX REFERENCE: FIX-20260127-04 - Cambio de @shared/ a ruta relativa para compatibilidad tsc
import { seedInitialInventory, getAllProducts, resetInventory, adjustStock } from "./database/inventoryService"
import { closePrismaClient } from "./database/db"
import { importarSicar } from "./services/importService"
import { syncInventory } from "./services/syncService"
// IMPL-20260128-01: Importar AuthService y canales de autenticación
import AuthService from "./services/authService"
import { registerAuthIPC } from "./ipc/authIPC"
// IMPL-20260129-01: Importar ConfigService y configIPC
import { configService } from "./services/configService"
import { registerConfigIPC } from "./ipc/configIPC"

let mainWindow: BrowserWindow | null = null
let scaleService: IScaleService | null = null
let sayerService: SayerService | null = null

/**
 * Reiniciar el servicio de báscula cuando cambia la configuración
 * FIX-20260129-01: Detener servicio actual, instanciar nuevo, iniciar
 */
function restartScaleService(mainWindow: BrowserWindow | null): IScaleService {
  if (!mainWindow) {
    throw new Error("[Main] mainWindow no disponible para reiniciar servicio")
  }

  console.log("[Main] Reiniciando servicio de báscula...")

  // Detener servicio actual si existe
  if (scaleService) {
    try {
      scaleService.stop()
      console.log("[Main] Servicio anterior detenido")
    } catch (e) {
      console.error("[Main] Error al detener servicio anterior:", e)
    }
  }

  // Instanciar nuevo servicio según configuración
  scaleService = initScaleService(mainWindow)

  // Iniciar el nuevo servicio (sin target, esperará a ser llamado por INICIAR_MEZCLA)
  try {
    // No iniciamos aquí, solo lo dejamos listo. Se inicia cuando INICIAR_MEZCLA lo requiera
    console.log("[Main] Nuevo servicio instanciado y listo")
  } catch (e) {
    console.error("[Main] Error con nuevo servicio:", e)
  }

  return scaleService
}

/**
 * Inicializar el servicio de báscula según la configuración
 */
function initScaleService(mainWindow: BrowserWindow): IScaleService {
  const config = configService.getConfig()
  let service: IScaleService

  if (config.mode === "DEMO") {
    console.log("[Main] Inicializando MockScaleService (MODO DEMO)")
    service = new MockScaleService(mainWindow)
  } else {
    console.log(
      `[Main] Inicializando SerialScaleService (MODO PROD) - Puerto: ${config.hardware.scalePort}`
    )
    service = new SerialScaleService(
      mainWindow,
      config.hardware.scalePort,
      config.hardware.baudRate
    )
  }

  return service
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // FIX REFERENCE: FIX-20260128-02 - Preload en .js con CommonJS
      preload: path.join(__dirname, "ipc/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Requerido en contenedor sin SUID sandbox
    },
  })

  const isDevelopment = process.env.NODE_ENV === "development"
  const startUrl = isDevelopment
    ? "http://localhost:5173" // Vite dev server
    : `file://${path.join(__dirname, "../../renderer/index.html")}` // Production build

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

  // IMPL-20260129-01: Inicializar servicio de báscula según configuración
  scaleService = initScaleService(mainWindow)

  // FIX-20260129-01: Suscribirse a cambios de configuración para reiniciar servicio de báscula
  configService.on("config-changed", (event) => {
    console.log("[Main] Evento config-changed recibido:", event)
    const oldMode = event.oldConfig.mode
    const newMode = event.newConfig.mode
    const hardwareChanged =
      event.oldConfig.hardware.scalePort !== event.newConfig.hardware.scalePort ||
      event.oldConfig.hardware.baudRate !== event.newConfig.hardware.baudRate

    // Reiniciar servicio si cambió el modo o configuración de hardware
    if (oldMode !== newMode || hardwareChanged) {
      console.log(
        `[Main] Cambio detectado: modo ${oldMode} -> ${newMode} o hardware cambió`
      )
      scaleService = restartScaleService(mainWindow)
    }
  })

  // Inicializar Sayer Service usando ruta de la configuración
  const config = configService.getConfig()
  sayerService = new SayerService(mainWindow, {
    spoolDir: config.paths.sayerSpoolDir,
    debounceMs: 500,
  })
  sayerService.start()

  // IMPL-20260128-01: Registrar canales de autenticación
  registerAuthIPC()

  // IMPL-20260129-01: Registrar canales de configuración
  registerConfigIPC(mainWindow)

  // IMPL-20260128-01: Seed automático de usuario admin si no existen usuarios
  AuthService.seedDefaultAdmin()
    .then(() => console.log("[Main] Sistema de autenticación inicializado"))
    .catch((err) => console.error("[Main] Error al inicializar autenticación:", err))

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

/**
 * SYNC_INVENTARIO: Sincroniza el inventario con un servidor cloud (Railway)
 * ID Intervención: IMPL-20260128-03
 */
ipcMain.handle(IPCInvokeChannels.SYNC_INVENTARIO, async () => {
  try {
    console.log("[IPC] Solicitud: SYNC_INVENTARIO")
    const resultado = await syncInventory("TALLER-PC01")
    console.log(`[IPC] Sincronización completada:`, resultado)
    return { success: true, data: resultado }
  } catch (error) {
    console.error("[IPC] Error en SYNC_INVENTARIO:", error)
    return { success: false, error: String(error) }
  }
})

/**
 * AJUSTAR_STOCK: Realiza ajuste manual de stock (suma o resta) con auditoría
 * ID Intervención: IMPL-20260128-02
 */
ipcMain.handle(
  IPCInvokeChannels.AJUSTAR_STOCK,
  async (_, params: AjusteStockParams) => {
    try {
      console.log(
        `[IPC] Solicitud: AJUSTAR_STOCK - SKU: ${params.sku}, Cantidad: ${params.cantidad}, Operación: ${params.operacion}, Motivo: ${params.motivo}`
      )
      const nuevoStock = await adjustStock(
        params.sku,
        params.cantidad,
        params.motivo,
        params.operacion
      )
      console.log(`[IPC] Stock ajustado exitosamente. Nuevo stock: ${nuevoStock}g`)
      return { success: true, nuevoStock }
    } catch (error) {
      console.error("[IPC] Error en AJUSTAR_STOCK:", error)
      return { success: false, error: String(error) }
    }
  }
)

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
