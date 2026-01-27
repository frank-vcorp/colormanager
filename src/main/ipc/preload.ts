/**
 * Preload Script para ContextBridge
 * Establece puente seguro entre Main (Node) y Renderer (React)
 * 
 * ID Intervención: IMPL-20260127-02
 */

import { contextBridge, ipcRenderer } from "electron"
import { IPCChannels, IPCInvokeChannels, PesoEvent, RecetaSayer } from "@shared/types"

// Exponer solo lo necesario via ContextBridge
contextBridge.exposeInMainWorld("colorManager", {
  // Listeners (Main -> Renderer)
  onPesoActualizado: (callback: (evento: PesoEvent) => void) => {
    ipcRenderer.on(IPCChannels.PESO_ACTUALIZADO, (_, data) => callback(data))
  },

  onRecetaDetectada: (callback: (receta: RecetaSayer) => void) => {
    ipcRenderer.on(IPCChannels.SESION_ACTUALIZADA, (_, data) => callback(data))
  },

  onError: (callback: (error: string) => void) => {
    ipcRenderer.on(IPCChannels.ERROR, (_, data) => callback(data))
  },

  onEstadoBascula: (callback: (estado: { conectada: boolean; peso: number }) => void) => {
    ipcRenderer.on(IPCChannels.ESTADO_BASCULA, (_, data) => callback(data))
  },

  // Invokes (Renderer -> Main)
  getSesionActual: () => ipcRenderer.invoke(IPCInvokeChannels.GET_SESION_ACTUAL),
  iniciarMezcla: (recetaId: string) => ipcRenderer.invoke(IPCInvokeChannels.INICIAR_MEZCLA, recetaId),
  registrarPeso: (peso: number) => ipcRenderer.invoke(IPCInvokeChannels.REGISTRAR_PESO, peso),
  cancelarMezcla: () => ipcRenderer.invoke(IPCInvokeChannels.CANCELAR_MEZCLA),
  siguienteIngrediente: () => ipcRenderer.invoke(IPCInvokeChannels.SIGUIENTE_INGREDIENTE),
})

export type ColorManagerAPI = typeof contextBridge.exposeInMainWorld
