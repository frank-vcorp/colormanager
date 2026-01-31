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

// ARCH-20260130-04: Monitoreo de Impresora Virtual
export type PrinterState = "IDLE" | "RECEIVING" | "PROCESSING" | "ERROR"

export interface PrintJob {
  id: string
  timestamp: string
  size: number
  status: "SUCCESS" | "FAILED"
  preview?: string // Snippet del contenido
  recetaNumero?: string
}

export interface PrinterStatus {
  state: PrinterState
  lastSync?: string
  jobsCount: number
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

// Registro de mezcla finalizada (persistencia)
export interface RegistroMezcla {
  id: string
  recetaId: string
  recetaNombre: string
  fecha: string // ISO 8601
  horaInicio: string
  horaFin: string
  pesoTotal: number
  pesoFinal: number
  ingredientes: Array<{
    codigo: string
    pesoTarget: number
    pesoPesado: number
  }>
  estado: "perfecto" | "desviado" | "cancelado"
  diferencia: number // pesoFinal - pesoTotal
  tolerancia: number
  notas?: string
  // Nuevos campos ARCH-20260130-01
  tipoMezcla?: TipoMezcla
  operadorId?: number
  operadorNombre?: string
  colorCode?: string
}

// Canales de IPC (Main -> Renderer)
export const IPCChannels = {
  PESO_ACTUALIZADO: "peso:actualizado",
  RECETA_DETECTADA: "receta:detectada",
  SESION_ACTUALIZADA: "sesion:actualizada",
  ERROR: "error",
  ESTADO_BASCULA: "bascula:estado",
  CONFIG_CHANGED: "config:changed",
  PRINTER_STATUS: "printer:status",   // ARCH-20260130-04
  PRINTER_QUEUE: "printer:queue",     // ARCH-20260130-04
} as const

// Lote (Partida) de Ingrediente - IMPL-20260129-01
export interface Lote {
  id: string
  numeroLote: string
  cantidad: number
  estado: "activo" | "parcial" | "agotado"
  createdAt: string
}

// Lote de producto (FIFO - IMPL-20260129-01)
export interface Lote {
  id: string
  numeroLote: string
  cantidad: number
  fechaVencimiento?: string
  estado: "activo" | "parcial" | "agotado"
  createdAt: string
}

// Producto de inventario
export interface Producto {
  sku: string
  nombre: string
  stockActual: number
  unidad: "g" | "ml"
  costoPromedio?: number
  lotes?: Lote[] // Lotes del producto (opcional, cargado por demanda - IMPL-20260129-01)
}

// Canales de IPC (Renderer -> Main)
export const IPCInvokeChannels = {
  GET_SESION_ACTUAL: "sesion:obtener",
  INICIAR_MEZCLA: "sesion:iniciar",
  REGISTRAR_PESO: "sesion:registrar-peso",
  CANCELAR_MEZCLA: "sesion:cancelar",
  SIGUIENTE_INGREDIENTE: "sesion:siguiente",
  GUARDAR_MEZCLA: "mezcla:guardar",
  OBTENER_HISTORIAL: "mezcla:historial",
  OBTENER_MIS_MEZCLAS: "mezcla:mis-mezclas", // ARCH-20260130-01: Mezclas del entonador
  REPETIR_MEZCLA: "mezcla:repetir", // ARCH-20260130-01: Cargar receta de mezcla anterior
  OBTENER_INVENTARIO: "inventario:obtener",
  RESETEAR_INVENTARIO: "inventario:resetear",
  IMPORTAR_INVENTARIO_CSV: "inventario:importar-csv",
  SYNC_INVENTARIO: "inventario:sincronizar",
  AJUSTAR_STOCK: "inventario:ajustar-stock",
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_CHECK: "auth:check",
  // IMPL-20260129-01: Canales de Configuración Dinámica
  CONFIG_GET: "config:get",
  CONFIG_SET: "config:set",
  CONFIG_SET_MODE: "config:setMode",
  CONFIG_RESET: "config:reset",
  MINIMIZAR_VENTANA: "window:minimizar",
} as const

// Roles del sistema
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "OPERADOR"

// Tipo de mezcla
export type TipoMezcla = "NUEVA" | "RETOQUE" | "AJUSTE_TONO"

// Usuario autenticado
export interface User {
  id: number
  username: string
  role: UserRole
  nombre: string
}

// Resultado de autenticación
export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
  sessionId?: string
}


// Resultado de importación CSV
export interface ImportacionResultado {
  procesados: number
  actualizados: number
  creados: number
  errores: string[]
}

// Respuesta de sincronización con nube
export interface SyncResponse {
  success: boolean
  processed?: number
  error?: string
  timestamp?: string
}

// Parámetros y respuesta de ajuste de stock
export interface AjusteStockParams {
  sku: string
  cantidad: number
  motivo: string
  operacion: "sumar" | "restar"
}

export interface AjusteStockResponse {
  success: boolean
  nuevoStock?: number
  error?: string
}
// Configuración de aplicación (IMPL-20260129-01: Config Dinámica)
export interface AppConfig {
  mode: "DEMO" | "PRODUCTION"
  hardware: {
    scalePort: string // ej: "COM3", "/dev/ttyUSB0"
    baudRate: number // ej: 9600
  }
  paths: {
    sayerSpoolDir: string // Ruta absoluta a carpeta de recetas
    printerPort: number // Puerto para impresora virtual (ej. 9100)
  }
}