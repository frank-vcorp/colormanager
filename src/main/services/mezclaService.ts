/**
 * MezclaService: Gestión de mezclas (persistencia e historial)
 * ID Intervención: ARCH-20260130-01
 * 
 * Funcionalidades:
 * - Guardar mezcla finalizada
 * - Obtener historial completo (Admin)
 * - Obtener mis mezclas (Entonador - filtrado por operador y fecha)
 * - Repetir mezcla (obtener datos para cargar de nuevo)
 */

import { getPrismaClient } from "../database/db"
import { RegistroMezcla, TipoMezcla } from "../../shared/types"
import { randomUUID } from "crypto"

/**
 * Guardar una mezcla finalizada en la BD
 */
export async function guardarMezcla(
  registro: RegistroMezcla
): Promise<RegistroMezcla> {
  const prisma = getPrismaClient()
  
  const id = registro.id || randomUUID()
  
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Mezcla" (
        "id", "recetaId", "recetaNombre", "colorCode", "fecha", 
        "horaInicio", "horaFin", "pesoTotal", "pesoFinal", 
        "ingredientes", "estado", "diferencia", "tolerancia", 
        "notas", "tipoMezcla", "operadorId", "operadorNombre"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      registro.recetaId,
      registro.recetaNombre,
      registro.colorCode || null,
      registro.fecha,
      registro.horaInicio,
      registro.horaFin,
      registro.pesoTotal,
      registro.pesoFinal,
      JSON.stringify(registro.ingredientes),
      registro.estado,
      registro.diferencia,
      registro.tolerancia,
      registro.notas || null,
      registro.tipoMezcla || "NUEVA",
      registro.operadorId || null,
      registro.operadorNombre || null
    )
    
    console.log(`[MezclaService] ✅ Mezcla guardada: ${id}`)
    
    return { ...registro, id }
  } catch (error) {
    console.error("[MezclaService] ❌ Error al guardar mezcla:", error)
    throw error
  }
}

/**
 * Obtener historial completo de mezclas (para Admin)
 */
export async function obtenerHistorial(): Promise<RegistroMezcla[]> {
  const prisma = getPrismaClient()
  
  try {
    const mezclas = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Mezcla" ORDER BY "createdAt" DESC LIMIT 500
    `) as any[]
    
    return mezclas.map(parseMezclaRow)
  } catch (error) {
    console.error("[MezclaService] ❌ Error al obtener historial:", error)
    return []
  }
}

/**
 * Obtener mezclas del entonador (filtrado por operador y fecha)
 * Por defecto: últimos 7 días
 */
export async function obtenerMisMezclas(
  operadorId?: number,
  diasAtras: number = 7
): Promise<RegistroMezcla[]> {
  const prisma = getPrismaClient()
  
  try {
    // Calcular fecha límite (hace X días)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - diasAtras)
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0]
    
    let mezclas: any[]
    
    if (operadorId) {
      // Filtrar por operador y fecha
      mezclas = await prisma.$queryRawUnsafe(`
        SELECT * FROM "Mezcla" 
        WHERE "operadorId" = ? AND "fecha" >= ?
        ORDER BY "createdAt" DESC 
        LIMIT 100
      `, operadorId, fechaLimiteStr) as any[]
    } else {
      // Sin operador, mostrar todas las del período
      mezclas = await prisma.$queryRawUnsafe(`
        SELECT * FROM "Mezcla" 
        WHERE "fecha" >= ?
        ORDER BY "createdAt" DESC 
        LIMIT 100
      `, fechaLimiteStr) as any[]
    }
    
    return mezclas.map(parseMezclaRow)
  } catch (error) {
    console.error("[MezclaService] ❌ Error al obtener mis mezclas:", error)
    return []
  }
}

/**
 * Obtener una mezcla por ID (para repetir)
 */
export async function obtenerMezclaPorId(id: string): Promise<RegistroMezcla | null> {
  const prisma = getPrismaClient()
  
  try {
    const mezclas = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Mezcla" WHERE "id" = ? LIMIT 1
    `, id) as any[]
    
    if (mezclas.length === 0) return null
    
    return parseMezclaRow(mezclas[0])
  } catch (error) {
    console.error("[MezclaService] ❌ Error al obtener mezcla:", error)
    return null
  }
}

/**
 * Parsear fila de BD a RegistroMezcla
 */
function parseMezclaRow(row: any): RegistroMezcla {
  return {
    id: row.id,
    recetaId: row.recetaId,
    recetaNombre: row.recetaNombre,
    colorCode: row.colorCode,
    fecha: row.fecha,
    horaInicio: row.horaInicio,
    horaFin: row.horaFin,
    pesoTotal: row.pesoTotal,
    pesoFinal: row.pesoFinal,
    ingredientes: typeof row.ingredientes === 'string' 
      ? JSON.parse(row.ingredientes) 
      : row.ingredientes,
    estado: row.estado,
    diferencia: row.diferencia,
    tolerancia: row.tolerancia,
    notas: row.notas,
    tipoMezcla: row.tipoMezcla as TipoMezcla,
    operadorId: row.operadorId,
    operadorNombre: row.operadorNombre,
  }
}

export default {
  guardarMezcla,
  obtenerHistorial,
  obtenerMisMezclas,
  obtenerMezclaPorId,
}
