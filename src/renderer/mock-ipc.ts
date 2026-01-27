import { PesoEvent, IPCChannels, RecetaSayer } from "../shared/types"

/**
 * Mock IPC para desarrollo en navegador (sin Electron)
 * Permite visualizar la UI en Simple Browser simulando los eventos de Node.js
 * 
 * ID Intervención: IMPL-20260127-02
 */
export function setupBrowserMock() {
  if (window.colorManager) return // Ya estamos en Electron

  console.log("🔧 Ejecutando en modo Navegador: Activando Mock IPC")

  // Simulación de Estado Interno
  const listeners: Record<string, Function[]> = {}
  let pesoInterval: any = null

  // Receta de ejemplo para simulación
  const recetaEjemplo: RecetaSayer = {
    numero: "001",
    historia: "F",
    capas: [
      {
        nombre: "Primera capa",
        ingredientes: [
          { orden: 1, sku: "KT-1400", pesoMeta: 323.0 },
          { orden: 2, sku: "KT-1100", pesoMeta: 249.0 },
          { orden: 3, sku: "KT-1930", pesoMeta: 186.0 },
          { orden: 4, sku: "KT-1420", pesoMeta: 125.0 },
          { orden: 5, sku: "KT-1550", pesoMeta: 102.0 },
          { orden: 6, sku: "KT-1220", pesoMeta: 15.0 },
        ],
      },
    ],
    meta: {
      carMaker: "VW",
      colorCode: "L041",
      sayerCode: "CH-123",
    },
  }

  // Implementación del API
  window.colorManager = {
    // @ts-ignore
    onPesoActualizado: (callback: (peso: PesoEvent) => void) => {
      if (!listeners[IPCChannels.PESO_ACTUALIZADO])
        listeners[IPCChannels.PESO_ACTUALIZADO] = []
      listeners[IPCChannels.PESO_ACTUALIZADO].push(callback)

      // Retornar función de limpieza
      return () => {
        listeners[IPCChannels.PESO_ACTUALIZADO] = listeners[
          IPCChannels.PESO_ACTUALIZADO
        ].filter((cb) => cb !== callback)
      }
    },

    // @ts-ignore
    onRecetaDetectada: (callback: (receta: RecetaSayer) => void) => {
      if (!listeners[IPCChannels.RECETA_DETECTADA])
        listeners[IPCChannels.RECETA_DETECTADA] = []
      listeners[IPCChannels.RECETA_DETECTADA].push(callback)

      return () => {
        listeners[IPCChannels.RECETA_DETECTADA] = listeners[
          IPCChannels.RECETA_DETECTADA
        ].filter((cb) => cb !== callback)
      }
    },

    // @ts-ignore
    onEstadoBascula: (callback: (estado: { conectada: boolean; peso: number }) => void) => {
      // Simular conexión inmediata
      setTimeout(() => callback({ conectada: true, peso: 0 }), 100)
      return () => {}
    },

    // @ts-ignore
    onError: (callback: (error: any) => void) => {
      if (!listeners[IPCChannels.ERROR]) listeners[IPCChannels.ERROR] = []
      listeners[IPCChannels.ERROR].push(callback)
      return () => {}
    },

    iniciarMezcla: async (recetaId: string) => {
      console.log(`[MOCK] Iniciando mezcla para ${recetaId}`)

      // Simular flujo de pesaje
      if (pesoInterval) clearInterval(pesoInterval)

      let peso = 0
      const target = 150.0

      pesoInterval = setInterval(() => {
        peso += Math.random() * 2 + 0.5
        if (peso > target) peso = target

        // Emitir evento a los listeners
        const event: PesoEvent = {
          peso: Math.round(peso * 10) / 10,
          timestamp: Date.now(),
          estable: peso >= target - 0.5,
        }

        const subs = listeners[IPCChannels.PESO_ACTUALIZADO] || []
        subs.forEach((cb) => cb(event))

        if (event.estable) {
          clearInterval(pesoInterval)
        }
      }, 100)
    },

    detenerMezcla: async () => {
      if (pesoInterval) clearInterval(pesoInterval)
    },

    tara: async () => {
      console.log("[MOCK] Tara")
    },

    getSesionActual: async () => null,

    cancelarMezcla: async () => {
      if (pesoInterval) clearInterval(pesoInterval)
    },

    registrarPeso: async (peso: number) => {
      console.log(`[MOCK] Registrar peso: ${peso}`)
    },

    siguienteIngrediente: async () => {
      console.log("[MOCK] Siguiente ingrediente")
    },

    // Método para simular receta (solo en navegador)
    simularReceta: (receta?: RecetaSayer) => {
      const r = receta || recetaEjemplo
      console.log("[MOCK] Simulando receta:", r)
      const subs = listeners[IPCChannels.RECETA_DETECTADA] || []
      subs.forEach((cb) => cb(r))
    },
  } as any

  // Exponer función global para fácil acceso
  ;(window as any).simularReceta = (window.colorManager as any).simularReceta

  // Crear botón flotante para disparar receta manualmente en navegador
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createFloatingButton)
  } else {
    createFloatingButton()
  }

  function createFloatingButton() {
    const button = document.createElement("button")
    button.id = "mock-trigger-receta"
    button.innerHTML = "🧪 Simular Receta"
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 16px;
      background-color: #8b5cf6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
    `

    button.onmouseover = () => {
      button.style.backgroundColor = "#7c3aed"
      button.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)"
    }

    button.onmouseout = () => {
      button.style.backgroundColor = "#8b5cf6"
      button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"
    }

    button.onclick = () => {
      console.log("🧪 Disparando receta de prueba...")
      ;(window.colorManager as any).simularReceta()
    }

    document.body.appendChild(button)
  }
}
