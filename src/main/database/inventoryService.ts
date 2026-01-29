/**
 * Servicio de Inventario con Prisma
 * Gestiona productos (Ingredientes), stock y sincronización con BD
 *
 * ID Intervención: IMPL-20260127-08
 * Referencia: context/Contexto_Tecnico_ColorManager.md
 */

import { Producto } from "../../shared/types"
// FIX REFERENCE: FIX-20260127-04
import { getPrismaClient } from "./db"
import { randomUUID } from "crypto"

/**
 * Datos iniciales de inventario (mismos que en mock-ipc.ts)
 * Estos se cargan si la tabla está vacía
 */
const INVENTARIO_INICIAL: Producto[] = [
  { sku: "KT-1400", nombre: "Tinte Rojo Base", stockActual: 2000, unidad: "g" },
  { sku: "KT-1100", nombre: "Tinte Amarillo Oscuro", stockActual: 2000, unidad: "g" },
  { sku: "KT-1930", nombre: "Tinte Naranja", stockActual: 2000, unidad: "g" },
  { sku: "KT-1420", nombre: "Tinte Blanco", stockActual: 2000, unidad: "g" },
  { sku: "KT-1550", nombre: "Tinte Negro", stockActual: 2000, unidad: "g" },
  { sku: "KT-1220", nombre: "Tinte Verde", stockActual: 2000, unidad: "g" },
]

/**
 * Obtiene todos los productos (ingredientes) con stock actual
 * @returns Array de Producto con sku, nombre, stockActual, unidad
 */
export async function getAllProducts(): Promise<Producto[]> {
  const prisma = getPrismaClient()

  try {
    const ingredientes = await prisma.ingrediente.findMany({
      select: {
        codigo: true, // sku
        nombre: true,
        stockActual: true,
        lotes: { // Incluir lotes (IMPL-20260129-01)
          select: {
            id: true,
            numeroLote: true,
            cantidad: true,
            estado: true,
            createdAt: true,
          },
        },
      },
    })

    // Mapear modelo Prisma a tipo Producto
    return ingredientes.map((ing: { codigo: string; nombre: string; stockActual: number; lotes: Array<{ id: string; numeroLote: string; cantidad: number; estado: string; createdAt: Date }> }) => ({
      sku: ing.codigo,
      nombre: ing.nombre,
      stockActual: ing.stockActual,
      unidad: "g" as const, // Por ahora todos en gramos
      lotes: ing.lotes.map((lote: { id: string; numeroLote: string; cantidad: number; estado: string; createdAt: Date }) => ({
        id: lote.id,
        numeroLote: lote.numeroLote,
        cantidad: lote.cantidad,
        estado: lote.estado as "activo" | "parcial" | "agotado",
        createdAt: lote.createdAt.toISOString(),
      })),
    }))
  } catch (error) {
    console.error("[Inventory] Error al obtener productos:", error)
    throw error
  }
}

/**
 * Inicializa el inventario si está vacío
 * Verifica si la tabla tiene datos; si no, inserta INVENTARIO_INICIAL
 * Crea un Lote Inicial por cada ingrediente (IMPL-20260129-01)
 * Útil para primer inicio de la aplicación
 */
export async function seedInitialInventory(): Promise<void> {
  const prisma = getPrismaClient()

  try {
    const count = await prisma.ingrediente.count()

    if (count === 0) {
      console.log("[Inventory] Tabla vacía. Sembrando inventario inicial...")

      // Usar transacción para insertar múltiples ingredientes + lotes
      for (const producto of INVENTARIO_INICIAL) {
        const ingredienteId = `ING-${producto.sku}-${Date.now()}`
        
        // Crear ingrediente con lote inicial en transacción
        await prisma.$transaction([
          prisma.ingrediente.create({
            data: {
              id: ingredienteId,
              codigo: producto.sku,
              nombre: producto.nombre,
              descripcion: `Ingrediente: ${producto.nombre}`,
              densidad: 1.0, // Valor por defecto (g/ml)
              costo: 0, // Valor por defecto
              stockActual: producto.stockActual,
              stockMinimo: 100,
            },
          }),
          // Crear Lote Inicial (IMPL-20260129-01)
          prisma.lote.create({
            data: {
              id: randomUUID(),
              ingredienteId: ingredienteId,
              numeroLote: `LOTE-INICIAL-${producto.sku}`,
              cantidad: producto.stockActual,
              estado: "activo",
            },
          }),
        ])
      }
      
      console.log(`[Inventory] ${INVENTARIO_INICIAL.length} ingredientes con lotes iniciales insertados`)
    } else {
      console.log(`[Inventory] Tabla ya contiene ${count} ingredientes`)
    }
  } catch (error) {
    console.error("[Inventory] Error al sembrar inventario:", error)
    throw error
  }
}

/**
 * Consume stock usando algoritmo FIFO (First-In-First-Out)
 * Descuenta del lote más antiguo primero
 * 
 * ID Intervención: IMPL-20260129-01
 * 
 * @param ingredienteId ID del ingrediente
 * @param cantidad Cantidad a consumir en gramos
 * @param tx Transacción de Prisma (opcional)
 * @throws Error si el ingrediente no existe
 */
export async function consumirStockFIFO(
  ingredienteId: string,
  cantidad: number,
  tx?: any // PrismaTransaction
): Promise<void> {
  const prisma = tx || getPrismaClient()

  try {
    // Obtener ingrediente y sus lotes activos, ordenados por fecha
    const ingrediente = await prisma.ingrediente.findUnique({
      where: { id: ingredienteId },
      include: {
        lotes: {
          where: {
            estado: { in: ["activo", "parcial"] },
          },
          orderBy: {
            createdAt: "asc", // FIFO: más antiguo primero
          },
        },
      },
    })

    if (!ingrediente) {
      throw new Error(`Ingrediente con ID ${ingredienteId} no encontrado`)
    }

    let pendiente = cantidad
    const lotesAActualizar: Array<{ loteId: string; nuevoEstado: string; cantidad: number }> = []

    // Iterar sobre lotes activos y consumir FIFO
    for (const lote of ingrediente.lotes) {
      if (pendiente <= 0) break

      if (lote.cantidad >= pendiente) {
        // Este lote tiene suficiente: consumir pendiente y marcar como parcial si queda algo
        lotesAActualizar.push({
          loteId: lote.id,
          cantidad: lote.cantidad - pendiente,
          nuevoEstado: lote.cantidad - pendiente > 0 ? "parcial" : "agotado",
        })
        pendiente = 0
      } else {
        // Este lote se consume completamente, pasar al siguiente
        lotesAActualizar.push({
          loteId: lote.id,
          cantidad: 0,
          nuevoEstado: "agotado",
        })
        pendiente -= lote.cantidad
      }
    }

    // Actualizar lotes en transacción
    for (const actualización of lotesAActualizar) {
      await prisma.lote.update({
        where: { id: actualización.loteId },
        data: {
          cantidad: actualización.cantidad,
          estado: actualización.nuevoEstado,
        },
      })
    }

    // FIX REFERENCE: FIX-20260129-01 - Validación fail-safe
    // Si pendiente > 0, significa que no hay suficiente stock en lotes activos
    if (pendiente > 0) {
      const consumido = cantidad - pendiente
      throw new Error(
        `Stock insuficiente en lotes activos. Solicitado: ${cantidad}g, disponible en lotes: ${consumido}g`
      )
    }

    // Actualizar stock total del ingrediente (restar cantidad consumida)
    const stockRestante = cantidad - pendiente
    await prisma.ingrediente.update({
      where: { id: ingredienteId },
      data: {
        stockActual: {
          decrement: stockRestante,
        },
      },
    })

    console.log(
      `[FIFO] Consumido ${stockRestante}g de ${ingrediente.nombre} (ID: ${ingredienteId})`
    )
  } catch (error) {
    console.error(`[FIFO] Error al consumir stock FIFO:`, error)
    throw error
  }
}

/**
 * Descuenta stock de un producto por SKU (transaccional)
 * @param sku Código del ingrediente
 * @param gramos Cantidad a descontar
 * @throws Error si no hay stock suficiente o el SKU no existe
 */
export async function handleUsage(sku: string, gramos: number): Promise<void> {
  const prisma = getPrismaClient()

  try {
    const ingrediente = await prisma.ingrediente.findUnique({
      where: { codigo: sku },
    })

    if (!ingrediente) {
      throw new Error(`Ingrediente con SKU ${sku} no encontrado`)
    }

    if (ingrediente.stockActual < gramos) {
      throw new Error(
        `Stock insuficiente para ${sku}. Disponible: ${ingrediente.stockActual}g, solicitado: ${gramos}g`
      )
    }

    // Usar FIFO para consumir stock
    await consumirStockFIFO(ingrediente.id, gramos)

    // Log de sincronización (FIX REFERENCE: FIX-20260129-01)
    await prisma.syncLog.create({
      data: {
        id: randomUUID(),
        tabla: "Ingrediente",
        accion: "UPDATE",
        registroId: ingrediente.id,
        cambios: JSON.stringify({ sku, delta: -gramos, motivo: "Consumo FIFO" }),
        nodeId: "LOCAL",
      },
    })

    console.log(`[Inventory] Stock descontado FIFO: ${sku} -${gramos}g`)
  } catch (error) {
    console.error(`[Inventory] Error al descontar stock de ${sku}:`, error)
    throw error
  }
}

/**
 * Resetea el inventario: limpia la tabla y vuelve a sembrar con datos iniciales
 * Útil para testing y demostración
 */
export async function resetInventory(): Promise<void> {
  const prisma = getPrismaClient()

  try {
    console.log("[Inventory] Reseteando inventario...")

    // Eliminar todos los ingredientes
    await prisma.ingrediente.deleteMany({})

    // Volver a sembrar
    await seedInitialInventory()

    console.log("[Inventory] Inventario reseteado exitosamente")
  } catch (error) {
    console.error("[Inventory] Error al resetear inventario:", error)
    throw error
  }
}

/**
 * Ajusta el stock de un producto (suma o resta)
 * Registra la operación en SyncLog para auditoría
 * 
 * ID Intervención: IMPL-20260128-02 (actualizado IMPL-20260129-01)
 * - Suma: Crea un Lote nuevo con timestamp de ingreso
 * - Resta: Usa FIFO para consumir del lote más antiguo
 * 
 * @param sku Código del ingrediente
 * @param cantidad Cantidad a ajustar (siempre positiva)
 * @param motivo Razón del ajuste (ej: "Merma/Derrame", "Corrección Conteo")
 * @param operacion "sumar" para ingreso, "restar" para salida/merma
 * @returns Nuevo stock tras el ajuste
 * @throws Error si cantidad es negativa, SKU no existe, o stock quedaría negativo
 */
export async function adjustStock(
  sku: string,
  cantidad: number,
  motivo: string,
  operacion: "sumar" | "restar"
): Promise<number> {
  const prisma = getPrismaClient()
  
  try {
    // Validaciones
    if (cantidad <= 0) {
      throw new Error("La cantidad debe ser mayor a 0")
    }
    if (!motivo || motivo.trim().length === 0) {
      throw new Error("El motivo es obligatorio")
    }
    if (operacion !== "sumar" && operacion !== "restar") {
      throw new Error("La operación debe ser 'sumar' o 'restar'")
    }

    // Obtener ingrediente actual
    const ingrediente = await prisma.ingrediente.findUnique({
      where: { codigo: sku },
      include: { lotes: true }, // Incluir lotes (IMPL-20260129-01)
    })

    if (!ingrediente) {
      throw new Error(`Ingrediente con SKU ${sku} no encontrado`)
    }

    // Calcular nuevo stock
    const delta = operacion === "sumar" ? cantidad : -cantidad
    const nuevoStock = ingrediente.stockActual + delta
    
    // Validar que no quede negativo en resta
    if (nuevoStock < 0) {
      throw new Error(
        `Stock insuficiente. Actual: ${ingrediente.stockActual}g, intenta restar: ${cantidad}g`
      )
    }

    // Registrar en SyncLog para auditoría
    const cambios = {
      sku,
      delta,
      motivo,
      operacion,
      stockAnterior: ingrediente.stockActual,
      stockNuevo: nuevoStock,
      usuario: "Operador", // Hardcoded por ahora
      timestamp: new Date().toISOString(),
    }

    // Transacción: Actualizar ingrediente + SyncLog + Manejar Lotes
    if (operacion === "sumar") {
      // INGRESO: Crear nuevo Lote (IMPL-20260129-01)
      const numeroLote = `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      await prisma.$transaction([
        prisma.ingrediente.update({
          where: { codigo: sku },
          data: {
            stockActual: nuevoStock,
          },
        }),
        prisma.syncLog.create({
          data: {
            id: randomUUID(),
            tabla: "Inventario",
            accion: "AJUSTE_MANUAL",
            registroId: ingrediente.id,
            cambios: JSON.stringify(cambios),
            nodeId: "LOCAL",
          },
        }),
        // Crear nuevo Lote para el ingreso (IMPL-20260129-01)
        prisma.lote.create({
          data: {
            id: randomUUID(),
            ingredienteId: ingrediente.id,
            numeroLote,
            cantidad,
            estado: "activo",
          },
        }),
      ])

      console.log(
        `[Inventory] Ingreso: ${sku} +${cantidad}g por "${motivo}". Stock: ${ingrediente.stockActual}g -> ${nuevoStock}g. Lote: ${numeroLote}`
      )
    } else {
      // SALIDA: Usar FIFO para consumir (IMPL-20260129-01)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.$transaction(async (tx: any) => {
        // Primero consumir FIFO
        await consumirStockFIFO(ingrediente.id, cantidad, tx)
        
        // Luego registrar en SyncLog
        await tx.syncLog.create({
          data: {
            id: randomUUID(),
            tabla: "Inventario",
            accion: "AJUSTE_MANUAL",
            registroId: ingrediente.id,
            cambios: JSON.stringify(cambios),
            nodeId: "LOCAL",
          },
        })
      })

      console.log(
        `[Inventory] Salida FIFO: ${sku} -${cantidad}g por "${motivo}". Stock: ${ingrediente.stockActual}g -> ${nuevoStock}g`
      )
    }

    return nuevoStock
  } catch (error) {
    console.error(`[Inventory] Error al ajustar stock de ${sku}:`, error)
    throw error
  }
}

export default {
  getAllProducts,
  seedInitialInventory,
  handleUsage,
  resetInventory,
  adjustStock,
  consumirStockFIFO,
}
