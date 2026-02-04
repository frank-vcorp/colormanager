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
 * @updated FIX-20260204-15: Auto-instalar impresora y servicio al primer inicio
 * Respaldo: context/interconsultas/DICTAMEN_FIX-20260127-04.md
 * @see Checkpoints/IMPL-20260128-01-ElectronEnContenedor.md
 */

import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "path"
import fs from "fs"
import { spawn } from "child_process"
import { IScaleService } from "./hardware/scale-interface"
import { DymoHIDScaleService } from "./hardware/dymo-hid-scale"
import { MettlerToledoSerialService } from "./hardware/mettler-serial-scale"
import { SayerService } from "./services/sayer-service"
import { IPCChannels, IPCInvokeChannels, AjusteStockParams } from "../shared/types"
// FIX REFERENCE: FIX-20260127-04 - Cambio de @shared/ a ruta relativa para compatibilidad tsc
import { seedInitialInventory, getAllProducts, resetInventory, adjustStock } from "./database/inventoryService"
import { closePrismaClient, initializeDatabase } from "./database/db"
import { importarSicar } from "./services/importService"
import { syncInventory } from "./services/syncService"
// IMPL-20260128-01: Importar AuthService y canales de autenticación
import AuthService from "./services/authService"
import { registerAuthIPC } from "./ipc/authIPC"
import { VirtualPrinterServer } from "./services/VirtualPrinterServer"
// IMPL-20260129-01: Importar ConfigService y configIPC
import { configService } from "./services/configService"
import { registerConfigIPC } from "./ipc/configIPC"

let mainWindow: BrowserWindow | null = null
let scaleService: IScaleService | null = null
let sayerService: SayerService | null = null
let printerServer: VirtualPrinterServer | null = null

/**
 * FIX-20260204-15: Auto-configurar impresora al primer inicio en Windows
 * Ejecuta complete-setup.ps1 si la impresora no está instalada
 */
async function autoSetupPrinter(): Promise<void> {
  // Solo en Windows
  if (process.platform !== "win32") {
    console.log("[Main] Auto-setup: No es Windows, saltando")
    return
  }

  // Verificar si ya se ejecutó la configuración
  const configPath = path.join(app.getPath("userData"), "printer-configured.flag")
  if (fs.existsSync(configPath)) {
    console.log("[Main] Auto-setup: Ya configurado previamente")
    return
  }

  console.log("[Main] Auto-setup: Verificando configuración de impresora...")

  // Buscar el script de configuración
  const possiblePaths = [
    path.join(process.resourcesPath || "", "complete-setup.ps1"),
    path.join(__dirname, "../../build/complete-setup.ps1"),
    path.join(__dirname, "../../../build/complete-setup.ps1"),
    path.join(app.getAppPath(), "build/complete-setup.ps1"),
  ]

  let scriptPath = ""
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      scriptPath = p
      console.log(`[Main] Auto-setup: Script encontrado en ${p}`)
      break
    }
  }

  if (!scriptPath) {
    console.log("[Main] Auto-setup: Script no encontrado, saltando")
    return
  }

  console.log("[Main] Auto-setup: Ejecutando configuración automática...")

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-WindowStyle", "Hidden",
        "-File", scriptPath,
        "-Action", "install"
      ], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      })

      let stdout = ""
      let stderr = ""

      child.stdout?.on("data", (data) => {
        stdout += data.toString()
      })

      child.stderr?.on("data", (data) => {
        stderr += data.toString()
      })

      child.on("error", (err) => {
        console.error("[Main] Auto-setup: Error spawn:", err)
        reject(err)
      })

      child.on("close", (code) => {
        console.log(`[Main] Auto-setup: Proceso terminó con código ${code}`)
        if (stdout) console.log("[Main] Auto-setup stdout:", stdout.substring(0, 500))
        if (stderr) console.log("[Main] Auto-setup stderr:", stderr.substring(0, 500))
        
        // Marcar como configurado aunque haya errores (para no reintentar)
        fs.writeFileSync(configPath, new Date().toISOString())
        
        resolve()
      })

      // Timeout de 60 segundos
      setTimeout(() => {
        console.log("[Main] Auto-setup: Timeout, continuando...")
        fs.writeFileSync(configPath, new Date().toISOString())
        resolve()
      }, 60000)
    })

    console.log("[Main] Auto-setup: Configuración completada")
  } catch (err) {
    console.error("[Main] Auto-setup: Error:", err)
  }
}

/**
 * Reiniciar el servicio de báscula cuando cambia la configuración
 * FIX-20260129-01: Detener servicio actual, instanciar nuevo, iniciar
 */
function restartScaleService(mainWindow: BrowserWindow | null): IScaleService | null {
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
 * IMPL-20260204-01: Soporte para HID (Dymo USB) y Serial (Mettler Toledo)
 * FIX-20260204-07: Eliminado MockScaleService - si falla, retorna null
 */
function initScaleService(mainWindow: BrowserWindow): IScaleService | null {
  const config = configService.getConfig()

  // Determinar tipo de báscula (HID por defecto)
  const scaleType = config.hardware.scaleType || "HID"

  switch (scaleType) {
    case "HID":
      console.log("[Main] Inicializando DymoHIDScaleService (USB HID - Dymo)")
      try {
        const service = new DymoHIDScaleService(mainWindow)
        return service
      } catch (e) {
        console.error("[Main] ❌ Error al inicializar báscula HID:", e)
        return null
      }

    case "SERIAL":
      console.log(`[Main] Inicializando MettlerToledoSerialService - Puerto: ${config.hardware.scalePort}`)
      try {
        const service = new MettlerToledoSerialService(
          mainWindow,
          config.hardware.scalePort,
          config.hardware.baudRate
        )
        return service
      } catch (e) {
        console.error("[Main] ❌ Error al inicializar báscula Serial:", e)
        return null
      }

    default:
      console.warn(`[Main] Tipo de báscula desconocido: ${scaleType}`)
      return null
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      // FIX REFERENCE: FIX-20260128-02 - Preload en .js con CommonJS
      preload: path.join(__dirname, "ipc/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Requerido en contenedor sin SUID sandbox
    },
  })

  // FIX-20260130-01: Maximizar ventana para mejor visualización en laptops
  mainWindow.maximize()

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
    if (printerServer) {
      printerServer.stop()
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

    // ARCH-20260130-03: Reiniciar servidor de impresión si cambia el puerto
    // FIX-20260204-16: DESHABILITADO - usamos servicio PowerShell externo
    // if (event.oldConfig.paths.printerPort !== event.newConfig.paths.printerPort) {
    //   console.log(`[Main] Cambio en puerto de impresora: ${event.newConfig.paths.printerPort}`)
    //   if (printerServer) printerServer.stop()
    //   printerServer = new VirtualPrinterServer(mainWindow!, {
    //     port: event.newConfig.paths.printerPort,
    //     name: "ColorManager Printer"
    //   })
    //   printerServer.start()
    // }
  })

  // Inicializar Sayer Service usando ruta de la configuración
  const config = configService.getConfig()
  sayerService = new SayerService(mainWindow, {
    spoolDir: config.paths.sayerSpoolDir,
    debounceMs: 500,
  })
  sayerService.start()

  // FIX-20260204-16: VirtualPrinterServer DESHABILITADO en Windows
  // En Windows usamos el servicio PowerShell (ColorManagerPrinterService) que:
  // 1. Escucha en TCP 9100
  // 2. Guarda archivos en Documents/ColorManager/spool
  // 3. SayerService (arriba) detecta los archivos y los procesa
  // Esto evita conflicto de puertos entre Electron y el servicio PowerShell
  console.log(`[Main] VirtualPrinterServer DESHABILITADO - usando servicio PowerShell externo`)
  // printerServer = new VirtualPrinterServer(mainWindow!, {
  //   port: config.paths.printerPort,
  //   name: "ColorManager Printer"
  // })
  // printerServer.start()

  // IMPL-20260128-01: Registrar canales de autenticación
  registerAuthIPC()

  // IMPL-20260129-01: Registrar canales de configuración
  registerConfigIPC(mainWindow)

  // FIX-20260130-02: Inicializar base de datos (crear tablas si no existen)
  initializeDatabase()
    .then(() => {
      console.log("[Main] Base de datos inicializada")

      // IMPL-20260128-01: Seed automático de usuario admin si no existen usuarios
      return AuthService.seedDefaultAdmin()
    })
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
        conectada: scaleService?.isConnected() ?? false,
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
 * FIX-20260204-17: Devuelve array de productos actualizado
 */
ipcMain.handle(IPCInvokeChannels.RESETEAR_INVENTARIO, async () => {
  try {
    console.log("[IPC] Solicitud: RESETEAR_INVENTARIO")
    await resetInventory()
    // FIX-20260204-17: Devolver inventario actualizado
    const productos = await getAllProducts()
    console.log("[IPC] Inventario reseteado exitosamente")
    return productos
  } catch (error) {
    console.error("[IPC] Error en RESETEAR_INVENTARIO:", error)
    return []
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

// ==================== HANDLERS DE MEZCLAS (ARCH-20260130-01) ====================
import { guardarMezcla, obtenerHistorial, obtenerMisMezclas, obtenerMezclaPorId } from "./services/mezclaService"

/**
 * GUARDAR_MEZCLA: Persiste una mezcla finalizada en BD
 */
ipcMain.handle(IPCInvokeChannels.GUARDAR_MEZCLA, async (_, registro) => {
  try {
    console.log("[IPC] Solicitud: GUARDAR_MEZCLA")
    const mezclaGuardada = await guardarMezcla(registro)
    console.log(`[IPC] Mezcla guardada: ${mezclaGuardada.id}`)
    return { success: true, data: mezclaGuardada }
  } catch (error) {
    console.error("[IPC] Error en GUARDAR_MEZCLA:", error)
    return { success: false, error: String(error) }
  }
})

/**
 * OBTENER_HISTORIAL: Retorna el historial completo de mezclas (Admin)
 */
ipcMain.handle(IPCInvokeChannels.OBTENER_HISTORIAL, async () => {
  try {
    console.log("[IPC] Solicitud: OBTENER_HISTORIAL")
    const historial = await obtenerHistorial()
    console.log(`[IPC] Retornando ${historial.length} registros de historial`)
    return historial
  } catch (error) {
    console.error("[IPC] Error en OBTENER_HISTORIAL:", error)
    return []
  }
})

/**
 * OBTENER_MIS_MEZCLAS: Retorna mezclas del entonador (filtrado por operador y últimos 7 días)
 */
ipcMain.handle(IPCInvokeChannels.OBTENER_MIS_MEZCLAS, async (_, operadorId?: number) => {
  try {
    console.log(`[IPC] Solicitud: OBTENER_MIS_MEZCLAS (operadorId: ${operadorId || 'todos'})`)
    const mezclas = await obtenerMisMezclas(operadorId, 7)
    console.log(`[IPC] Retornando ${mezclas.length} mezclas`)
    return mezclas
  } catch (error) {
    console.error("[IPC] Error en OBTENER_MIS_MEZCLAS:", error)
    return []
  }
})

/**
 * REPETIR_MEZCLA: Obtiene una mezcla por ID para cargarla de nuevo
 */
ipcMain.handle(IPCInvokeChannels.REPETIR_MEZCLA, async (_, mezclaId: string) => {
  try {
    console.log(`[IPC] Solicitud: REPETIR_MEZCLA (id: ${mezclaId})`)
    const mezcla = await obtenerMezclaPorId(mezclaId)
    if (mezcla) {
      console.log(`[IPC] Mezcla encontrada: ${mezcla.recetaNombre}`)
      return { success: true, data: mezcla }
    } else {
      return { success: false, error: "Mezcla no encontrada" }
    }
  } catch (error) {
    console.error("[IPC] Error en REPETIR_MEZCLA:", error)
    return { success: false, error: String(error) }
  }
})

/**
 * MINIMIZAR_VENTANA: Minimiza la aplicación (ARCH-20260130-02)
 */
ipcMain.handle(IPCInvokeChannels.MINIMIZAR_VENTANA, async () => {
  if (mainWindow) {
    mainWindow.minimize()
    return { success: true }
  }
  return { success: false }
})

/**
 * INSTALL_PRINTER: Instala la impresora virtual ColorManager (IMPL-20260204-04)
 * Ejecuta el script PowerShell para crear puerto TCP y impresora
 * FIX-20260204-08: Usar shell.openExternal para abrir PowerShell como admin
 */
ipcMain.handle(IPCInvokeChannels.INSTALL_PRINTER, async () => {
  console.log("[Main] Solicitud de instalación de impresora recibida")
  console.log("[Main] Plataforma:", process.platform)
  console.log("[Main] __dirname:", __dirname)
  console.log("[Main] resourcesPath:", process.resourcesPath)
  
  // Solo funciona en Windows
  if (process.platform !== "win32") {
    return { success: false, error: "Solo disponible en Windows" }
  }
  
  try {
    const { spawn } = await import("child_process")
    const fs = await import("fs")
    
    // Buscar el script en múltiples ubicaciones
    const possiblePaths = [
      // Producción (extraResources) - primera prioridad
      path.join(process.resourcesPath || "", "setup-printer.ps1"),
      // Desarrollo
      path.join(__dirname, "../../build/setup-printer.ps1"),
      path.join(__dirname, "../../../build/setup-printer.ps1"),
      // Producción alternativa
      path.join(app.getAppPath(), "build/setup-printer.ps1"),
      path.join(app.getAppPath(), "../setup-printer.ps1"),
    ]
    
    let finalScriptPath = ""
    for (const p of possiblePaths) {
      console.log(`[Main] Verificando: ${p}`)
      if (fs.existsSync(p)) {
        finalScriptPath = p
        console.log(`[Main] ✓ Script encontrado: ${p}`)
        break
      }
    }
    
    if (!finalScriptPath) {
      const errorMsg = `Script no encontrado. Rutas probadas:\n${possiblePaths.join("\n")}`
      console.error("[Main] ❌", errorMsg)
      return { success: false, error: errorMsg }
    }
    
    // Copiar script a ubicación temporal para evitar problemas de rutas
    const tempScript = path.join(app.getPath("temp"), "setup-printer.ps1")
    fs.copyFileSync(finalScriptPath, tempScript)
    console.log(`[Main] Script copiado a: ${tempScript}`)
    
    // Usar spawn con shell para ejecutar PowerShell con elevación
    // El truco es usar powershell Start-Process con -Verb RunAs
    const psCommand = `Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${tempScript}" -Action install' -Verb RunAs -Wait`
    
    console.log(`[Main] Comando: ${psCommand}`)
    
    return new Promise((resolve) => {
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-Command", psCommand
      ], {
        windowsHide: false, // Mostrar ventana para UAC
        shell: true
      })
      
      let stdout = ""
      let stderr = ""
      
      child.stdout?.on("data", (data) => {
        stdout += data.toString()
        console.log("[Main] stdout:", data.toString())
      })
      
      child.stderr?.on("data", (data) => {
        stderr += data.toString()
        console.log("[Main] stderr:", data.toString())
      })
      
      child.on("error", (err) => {
        console.error("[Main] Error spawn:", err)
        resolve({ success: false, error: err.message })
      })
      
      child.on("close", (code) => {
        console.log(`[Main] Proceso terminó con código: ${code}`)
        if (code === 0) {
          resolve({ success: true, output: "Verifique que la impresora 'ColorManager Printer' aparezca en Windows" })
        } else {
          // Código 1223 = Usuario canceló UAC
          if (code === 1223) {
            resolve({ success: false, error: "Instalación cancelada por el usuario" })
          } else {
            resolve({ success: false, error: stderr || `Código de salida: ${code}` })
          }
        }
      })
      
      // Timeout de 2 minutos
      setTimeout(() => {
        resolve({ success: true, output: "Proceso iniciado. Si apareció la ventana UAC, acepte para continuar." })
      }, 5000) // Resolvemos después de 5 segundos para no bloquear la UI
    })
  } catch (error: any) {
    console.error("[Main] Error al instalar impresora:", error)
    return { success: false, error: error.message || String(error) }
  }
})

/**
 * TEST_PRINTER: Envía una receta de prueba al servidor de impresión virtual
 * IMPL-20260204-05: Prueba que el servidor TCP esté escuchando correctamente
 */
ipcMain.handle(IPCInvokeChannels.TEST_PRINTER, async () => {
  console.log("[Main] Probando conexión de impresora virtual...")
  
  const config = configService.getConfig()
  const port = config.paths.printerPort || 9100
  
  try {
    const net = await import("net")
    
    return new Promise((resolve) => {
      const client = new net.Socket()
      let connected = false
      
      client.setTimeout(3000)
      
      client.connect(port, "127.0.0.1", () => {
        connected = true
        console.log("[Main] ✓ Conexión TCP exitosa al puerto", port)
        
        // Enviar receta de prueba
        const testReceta = `
========================================
SISTEMA SAYER - RECETA DE PRUEBA
========================================
Fecha: ${new Date().toLocaleString()}
Cliente: ColorManager Test
Orden: TEST-${Date.now()}

Código: BASE-WHITE-001
Color: BLANCO BRILLANTE

Componentes:
----------------------------------------
1. BASE BLANCA          2000.00 ml
2. PIGMENTO AZUL           5.50 ml
3. PIGMENTO AMARILLO       3.25 ml
----------------------------------------
TOTAL:                  2008.75 ml

========================================
** RECETA DE PRUEBA - NO PRODUCCIÓN **
========================================
`
        client.write(testReceta)
        client.end()
        
        resolve({ 
          success: true, 
          message: `Conexión exitosa al puerto ${port}. Se envió receta de prueba.` 
        })
      })
      
      client.on("timeout", () => {
        console.log("[Main] ✗ Timeout conectando al puerto", port)
        client.destroy()
        if (!connected) {
          resolve({ 
            success: false, 
            error: `Timeout: El servidor no responde en el puerto ${port}. ¿Está ColorManager ejecutándose?` 
          })
        }
      })
      
      client.on("error", (err: NodeJS.ErrnoException) => {
        console.log("[Main] ✗ Error de conexión:", err.message)
        if (!connected) {
          let errorMsg = `No se pudo conectar al puerto ${port}`
          if (err.code === "ECONNREFUSED") {
            errorMsg = `Puerto ${port} rechazó la conexión. El servidor TCP no está escuchando.`
          }
          resolve({ success: false, error: errorMsg })
        }
      })
    })
  } catch (error: any) {
    console.error("[Main] Error en prueba de impresora:", error)
    return { success: false, error: error.message || String(error) }
  }
})

// ============================================================================
// ARCH-20260204-01: HANDLERS DE ETIQUETAS QR
// ============================================================================

import * as qrLabelService from "./services/qrLabelService"

/**
 * QR_OBTENER_ETIQUETA: Obtiene datos de etiqueta para un lote específico
 */
ipcMain.handle(IPCInvokeChannels.QR_OBTENER_ETIQUETA, async (_, loteId: string) => {
  console.log("[Main] Obteniendo etiqueta QR para lote:", loteId)
  try {
    const data = await qrLabelService.getLabelData(loteId)
    if (!data) {
      return { success: false, error: "Lote no encontrado" }
    }
    return { success: true, data }
  } catch (error: any) {
    console.error("[Main] Error obteniendo etiqueta:", error)
    return { success: false, error: error.message || String(error) }
  }
})

/**
 * QR_IMPRIMIR: Imprime etiqueta de un lote específico
 */
ipcMain.handle(IPCInvokeChannels.QR_IMPRIMIR, async (_, loteId: string) => {
  console.log("[Main] Imprimiendo etiqueta QR para lote:", loteId)
  try {
    const data = await qrLabelService.getLabelData(loteId)
    if (!data) {
      return { success: false, error: "Lote no encontrado" }
    }
    return await qrLabelService.printLabel(data)
  } catch (error: any) {
    console.error("[Main] Error imprimiendo etiqueta:", error)
    return { success: false, error: error.message || String(error) }
  }
})

/**
 * QR_IMPRIMIR_TODAS: Imprime todas las etiquetas pendientes
 */
ipcMain.handle(IPCInvokeChannels.QR_IMPRIMIR_TODAS, async () => {
  console.log("[Main] Imprimiendo todas las etiquetas pendientes...")
  try {
    return await qrLabelService.printAllLabels()
  } catch (error: any) {
    console.error("[Main] Error imprimiendo etiquetas:", error)
    return { success: false, error: error.message || String(error) }
  }
})

/**
 * QR_PENDING_LABELS: Obtiene lista de etiquetas pendientes de imprimir
 */
ipcMain.handle(IPCInvokeChannels.QR_PENDING_LABELS, async () => {
  console.log("[Main] Obteniendo etiquetas pendientes...")
  try {
    const labels = await qrLabelService.getPendingLabels()
    return { success: true, data: labels }
  } catch (error: any) {
    console.error("[Main] Error obteniendo etiquetas pendientes:", error)
    return { success: false, error: error.message || String(error) }
  }
})

// App lifecycle
// FIX-20260204-15: Ejecutar auto-setup antes de crear la ventana
app.on("ready", async () => {
  // Auto-configurar impresora en Windows (solo primer inicio)
  await autoSetupPrinter()
  
  // Crear la ventana principal
  createWindow()
})

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
