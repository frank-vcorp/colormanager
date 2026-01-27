/**
 * Tipos compartidos entre Main y Renderer
 * ID Intervención: IMPL-20260127-02
 */

// Evento de peso desde la báscula (simulado o real)
export interface PesoEvent {
  peso: number // en gramos
  timestamp: number // milliseconds
  estable: boolean // true si el peso es estable
}

// Receta leída desde Sayer (estructura nativa del parser)
export interface RecetaSayer {
  numero: string // "001"
  historia: string // "F"
  capas: {
    nombre: string // "Primera capa"
    ingredientes: {
      orden: number // 1
      sku: string // "KT-1400"
      pesoMeta: number // 323.0
    }[]
  }[]
  meta: {
    carMaker?: string // "VW"
    colorCode?: string // "L041"
    sayerCode?: string // "CH-123"
    coatingType?: string
    primer?: string
  }
}

// Receta normalizada (compatibilidad)
export interface Receta {
  id: string
  nombre: string
  ingredientes: IngredienteReceta[]
  pesoTotal: number
  fecha?: string
}

export interface IngredienteReceta {
  codigo: string
  nombre: string
  pesoTarget: number
  orden: number
}

// Sesión de mezcla activa
export interface SesionMezcla {
  id: string
  recetaId: string
  recetaNombre: string
  ingredientes: IngredienteReceta[]
  pesoActual: number
  pesoTarget: number
  ingredienteActualIdx: number
  estado: "esperando" | "en_progreso" | "completada" | "error"
  startedAt?: number
  finishedAt?: number
}

// Canales de IPC (Main -> Renderer)
export const IPCChannels = {
  PESO_ACTUALIZADO: "peso:actualizado",
  RECETA_DETECTADA: "receta:detectada",
  SESION_ACTUALIZADA: "sesion:actualizada",
  ERROR: "error",
  ESTADO_BASCULA: "bascula:estado",
} as const

// Canales de IPC (Renderer -> Main)
export const IPCInvokeChannels = {
  GET_SESION_ACTUAL: "sesion:obtener",
  INICIAR_MEZCLA: "sesion:iniciar",
  REGISTRAR_PESO: "sesion:registrar-peso",
  CANCELAR_MEZCLA: "sesion:cancelar",
  SIGUIENTE_INGREDIENTE: "sesion:siguiente",
} as const
