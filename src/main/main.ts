/**
 * Main Process (Electron)
 * Gestiona ventana, IPC, hardware y base de datos
 * 
 * ID Intervención: IMPL-20260127-02
 */

import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import { MockScaleService } from "./hardware/mock-scale"
import { SayerService } from "./services/sayer-service"
import { IPCChannels, IPCInvokeChannels } from "@shared/types"

let mainWindow: BrowserWindow | null = null
let scaleService: MockScaleService | null = null
let sayerService: SayerService | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../main/ipc/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
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

// App lifecycle
app.on("ready", createWindow)

app.on("window-all-closed", () => {
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
