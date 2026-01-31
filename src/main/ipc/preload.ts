/**
 * Preload Script para ContextBridge
 * Establece puente seguro entre Main (Node) y Renderer (React)
 * 
 * ID Intervención: FIX-20260127-04 + IMPL-20260127-09
 * @updated IMPL-20260128-01: Validar compilación a .cjs y path aliases resueltos
 * @updated IMPL-20260128-03: Agregar sincronizarInventario() para Micro-Sprint 10
 * @updated IMPL-20260128-02: Agregar ajustarStock() para Micro-Sprint 11
 * @updated IMPL-20260129-01: Agregar métodos de configuración y onConfigChanged listener
 * @see Checkpoints/IMPL-20260128-01-ElectronEnContenedor.md
 */

import { contextBridge, ipcRenderer } from "electron"
import { IPCChannels, IPCInvokeChannels, PesoEvent, RecetaSayer, AjusteStockParams, AppConfig, PrinterStatus, PrintJob } from "../../shared/types"
// FIX REFERENCE: FIX-20260127-04

// Exponer solo lo necesario via ContextBridge
contextBridge.exposeInMainWorld("colorManager", {
  // Listeners (Main -> Renderer)
  onPesoActualizado: (callback: (evento: PesoEvent) => void) => {
    ipcRenderer.on(IPCChannels.PESO_ACTUALIZADO, (_, data) => callback(data))
  },

  onRecetaDetectada: (callback: (receta: RecetaSayer) => void) => {
    ipcRenderer.on(IPCChannels.RECETA_DETECTADA, (_, data) => callback(data))
  },

  onError: (callback: (error: string) => void) => {
    ipcRenderer.on(IPCChannels.ERROR, (_, data) => callback(data))
  },

  onEstadoBascula: (callback: (estado: { conectada: boolean; peso: number }) => void) => {
    ipcRenderer.on(IPCChannels.ESTADO_BASCULA, (_, data) => callback(data))
  },

  // IMPL-20260129-01: Listener para cambios de configuración
  onConfigChanged: (
    callback: (data: { oldConfig?: AppConfig; newConfig?: AppConfig; mode?: string }) => void
  ) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on(IPCChannels.CONFIG_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPCChannels.CONFIG_CHANGED, handler)
  },

  onPrinterStatus: (callback: (status: PrinterStatus) => void) => {
    ipcRenderer.on(IPCChannels.PRINTER_STATUS, (_, data) => callback(data))
  },

  onPrinterQueue: (callback: (queue: PrintJob[]) => void) => {
    ipcRenderer.on(IPCChannels.PRINTER_QUEUE, (_, data) => callback(data))
  },

  // Invokes (Renderer -> Main)
  getSesionActual: () => ipcRenderer.invoke(IPCInvokeChannels.GET_SESION_ACTUAL),
  iniciarMezcla: (recetaId: string) => ipcRenderer.invoke(IPCInvokeChannels.INICIAR_MEZCLA, recetaId),
  registrarPeso: (peso: number) => ipcRenderer.invoke(IPCInvokeChannels.REGISTRAR_PESO, peso),
  cancelarMezcla: () => ipcRenderer.invoke(IPCInvokeChannels.CANCELAR_MEZCLA),
  siguienteIngrediente: () => ipcRenderer.invoke(IPCInvokeChannels.SIGUIENTE_INGREDIENTE),
  guardarMezcla: (registro: any) => ipcRenderer.invoke(IPCInvokeChannels.GUARDAR_MEZCLA, registro),
  obtenerHistorial: () => ipcRenderer.invoke(IPCInvokeChannels.OBTENER_HISTORIAL),
  // ARCH-20260130-01: Nuevos métodos para entonador
  obtenerMisMezclas: (operadorId?: number) => ipcRenderer.invoke(IPCInvokeChannels.OBTENER_MIS_MEZCLAS, operadorId),
  repetirMezcla: (mezclaId: string) => ipcRenderer.invoke(IPCInvokeChannels.REPETIR_MEZCLA, mezclaId),
  obtenerInventario: () => ipcRenderer.invoke(IPCInvokeChannels.OBTENER_INVENTARIO),
  resetearInventario: () => ipcRenderer.invoke(IPCInvokeChannels.RESETEAR_INVENTARIO),
  importarInventarioCSV: () => ipcRenderer.invoke(IPCInvokeChannels.IMPORTAR_INVENTARIO_CSV),
  sincronizarInventario: () => ipcRenderer.invoke(IPCInvokeChannels.SYNC_INVENTARIO),
  ajustarStock: (params: AjusteStockParams) => ipcRenderer.invoke(IPCInvokeChannels.AJUSTAR_STOCK, params),

  // Auth
  login: (username: string, pass: string) => ipcRenderer.invoke(IPCInvokeChannels.AUTH_LOGIN, username, pass),
  logout: () => ipcRenderer.invoke(IPCInvokeChannels.AUTH_LOGOUT),
  checkAuth: () => ipcRenderer.invoke(IPCInvokeChannels.AUTH_CHECK),

  minimizarVentana: () => ipcRenderer.invoke(IPCInvokeChannels.MINIMIZAR_VENTANA),

  // IMPL-20260129-01: Configuración dinámica
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
})
