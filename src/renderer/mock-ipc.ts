import { PesoEvent, IPCChannels, RecetaSayer } from "../shared/types"

/**
 * Mock IPC para desarrollo en navegador (sin Electron)
 * Permite visualizar la UI en Simple Browser simulando los eventos de Node.js
 * 
 * Versión 2.0: Panel de control manual de hardware en esquina inferior derecha
 * ID Intervención: IMPL-20260128-01
 */
export function setupBrowserMock() {
  if (window.colorManager) return // Ya estamos en Electron

  console.log("🔧 Ejecutando en modo Navegador: Activando Mock IPC")

  // Simulación de Estado Interno
  const listeners: Record<string, Function[]> = {}
  let pesoActual = 0

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

  // Función auxiliar para emitir eventos de peso
  const emitirPeso = (peso: number, estable: boolean = false) => {
    pesoActual = peso
    const event: PesoEvent = {
      peso: Math.round(peso * 10) / 10,
      timestamp: Date.now(),
      estable: estable,
    }
    const subs = listeners[IPCChannels.PESO_ACTUALIZADO] || []
    subs.forEach((cb) => cb(event))
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
      setTimeout(() => callback({ conectada: true, peso: pesoActual }), 100)
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
      console.log("[MOCK] El peso será controlado manualmente desde el panel de hardware")
    },

    detenerMezcla: async () => {
      console.log("[MOCK] Mezcla detenida")
    },

    tara: async () => {
      console.log("[MOCK] Tara")
      emitirPeso(0)
    },

    getSesionActual: async () => null,

    cancelarMezcla: async () => {
      console.log("[MOCK] Mezcla cancelada")
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

  // Crear panel de control de hardware
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createHardwarePanel)
  } else {
    createHardwarePanel()
  }

  function createHardwarePanel() {
    const panel = document.createElement("div")
    panel.id = "mock-hardware-panel"
    
    // Estilos CSS inline para el panel
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #8b5cf6;
      border-radius: 12px;
      padding: 16px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 9999;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
    `

    const titleStyles = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 12px;
      text-align: center;
      color: #c084fc;
      letter-spacing: 0.5px;
    `

    const buttonGroupStyles = `
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    `

    const recipeButtonStyles = `
      flex: 1;
      padding: 10px 12px;
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `

    const separatorStyles = `
      height: 1px;
      background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
      margin: 12px 0;
    `

    const labelStyles = `
      font-size: 12px;
      font-weight: 600;
      color: #c084fc;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `

    const sliderStyles = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(90deg, #374151, #6366f1);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
      margin-bottom: 8px;
    `

    const sliderThumbStyles = `
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8b5cf6, #a78bfa);
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(139, 92, 246, 0.4);
    `

    const fineButtonGroupStyles = `
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    `

    const fineButtonStyles = `
      padding: 8px 4px;
      background: rgba(139, 92, 246, 0.2);
      color: #c084fc;
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `

    const checkboxContainerStyles = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    `

    const checkboxStyles = `
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #8b5cf6;
    `

    const checkboxLabelStyles = `
      font-size: 12px;
      color: #e0e0e0;
      cursor: pointer;
      user-select: none;
    `

    const displayStyles = `
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      text-align: center;
      border: 1px solid rgba(139, 92, 246, 0.2);
    `

    const displayValueStyles = `
      font-size: 20px;
      font-weight: bold;
      color: #a78bfa;
      font-family: 'Courier New', monospace;
    `

    // Estructura HTML
    panel.innerHTML = `
      <div style="${titleStyles}">🎛️ Mock Hardware</div>
      
      <div style="${buttonGroupStyles}">
        <button id="mock-recipe-btn" style="${recipeButtonStyles}">📜 Emitir Receta</button>
      </div>

      <div style="${separatorStyles}"></div>

      <div style="${labelStyles}">Peso Simulado</div>
      
      <div style="${displayStyles}">
        <div style="${displayValueStyles}" id="mock-peso-display">0.0g</div>
      </div>

      <input 
        type="range" 
        id="mock-peso-slider" 
        min="0" 
        max="500" 
        value="0"
        style="${sliderStyles}"
      />

      <div style="${fineButtonGroupStyles}">
        <button id="mock-btn-minus1" style="${fineButtonStyles}">-1g</button>
        <button id="mock-btn-minus01" style="${fineButtonStyles}">-0.1g</button>
        <button id="mock-btn-tara" style="${fineButtonStyles}">Tara</button>
        <button id="mock-btn-plus01" style="${fineButtonStyles}">+0.1g</button>
        <button id="mock-btn-plus1" style="${fineButtonStyles}">+1g</button>
      </div>

      <div style="${checkboxContainerStyles}">
        <input 
          type="checkbox" 
          id="mock-checkbox-stable"
          style="${checkboxStyles}"
        />
        <label for="mock-checkbox-stable" style="${checkboxLabelStyles}">
          Peso Estable
        </label>
      </div>
    `

    document.body.appendChild(panel)

    // Referencias a elementos
    const slider = document.getElementById("mock-peso-slider") as HTMLInputElement
    const display = document.getElementById("mock-peso-display") as HTMLDivElement
    const recipeBtn = document.getElementById("mock-recipe-btn") as HTMLButtonElement
    const stableCheckbox = document.getElementById("mock-checkbox-stable") as HTMLInputElement
    const minusBtn1 = document.getElementById("mock-btn-minus1") as HTMLButtonElement
    const minusBtn01 = document.getElementById("mock-btn-minus01") as HTMLButtonElement
    const taraBtn = document.getElementById("mock-btn-tara") as HTMLButtonElement
    const plusBtn01 = document.getElementById("mock-btn-plus01") as HTMLButtonElement
    const plusBtn1 = document.getElementById("mock-btn-plus1") as HTMLButtonElement

    // Función para actualizar peso
    const updatePeso = (newPeso: number) => {
      const clampedPeso = Math.max(0, Math.min(500, newPeso))
      slider.value = String(clampedPeso)
      display.textContent = `${(Math.round(clampedPeso * 10) / 10).toFixed(1)}g`
      emitirPeso(clampedPeso, stableCheckbox.checked)
    }

    // Event listeners
    slider.addEventListener("input", (e) => {
      const newPeso = parseFloat((e.target as HTMLInputElement).value)
      updatePeso(newPeso)
    })

    recipeBtn.addEventListener("click", () => {
      console.log("📜 Emitiendo receta de prueba...")
      ;(window.colorManager as any).simularReceta()
    })

    minusBtn1.addEventListener("click", () => {
      updatePeso(parseFloat(slider.value) - 1)
    })

    minusBtn01.addEventListener("click", () => {
      updatePeso(parseFloat(slider.value) - 0.1)
    })

    taraBtn.addEventListener("click", () => {
      updatePeso(0)
      stableCheckbox.checked = false
    })

    plusBtn01.addEventListener("click", () => {
      updatePeso(parseFloat(slider.value) + 0.1)
    })

    plusBtn1.addEventListener("click", () => {
      updatePeso(parseFloat(slider.value) + 1)
    })

    stableCheckbox.addEventListener("change", () => {
      emitirPeso(parseFloat(slider.value), stableCheckbox.checked)
    })

    // Agregar estilos para pseudo-elementos del slider
    const style = document.createElement("style")
    style.textContent = `
      #mock-peso-slider::-webkit-slider-thumb {
        ${sliderThumbStyles}
      }
      #mock-peso-slider::-moz-range-thumb {
        ${sliderThumbStyles}
        border: none;
      }
      #mock-recipe-btn:hover {
        background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        transform: translateY(-1px);
      }
      #mock-recipe-btn:active {
        transform: translateY(0);
      }
      #mock-btn-minus1:hover, #mock-btn-minus01:hover, #mock-btn-tara:hover,
      #mock-btn-plus01:hover, #mock-btn-plus1:hover {
        background: rgba(139, 92, 246, 0.4);
        border-color: rgba(139, 92, 246, 0.6);
        transform: translateY(-1px);
      }
      #mock-btn-minus1:active, #mock-btn-minus01:active, #mock-btn-tara:active,
      #mock-btn-plus01:active, #mock-btn-plus1:active {
        transform: translateY(0);
      }
    `
    document.head.appendChild(style)

    console.log("✅ Panel de control de hardware inicializado")
  }
}
