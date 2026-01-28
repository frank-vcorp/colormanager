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
      },
    })

    // Mapear modelo Prisma a tipo Producto
    return ingredientes.map((ing) => ({
      sku: ing.codigo,
      nombre: ing.nombre,
      stockActual: ing.stockActual,
      unidad: "g" as const, // Por ahora todos en gramos
    }))
  } catch (error) {
    console.error("[Inventory] Error al obtener productos:", error)
    throw error
  }
}

/**
 * Inicializa el inventario si está vacío
 * Verifica si la tabla tiene datos; si no, inserta INVENTARIO_INICIAL
 * Useful para primer inicio de la aplicación
 */
export async function seedInitialInventory(): Promise<void> {
  const prisma = getPrismaClient()

  try {
    const count = await prisma.ingrediente.count()

    if (count === 0) {
      console.log("[Inventory] Tabla vacía. Sembrando inventario inicial...")

      // Usar transacción para insertar múltiples ingredientes
      const promises = INVENTARIO_INICIAL.map((producto) =>
        prisma.ingrediente.create({
          data: {
            id: `ING-${producto.sku}-${Date.now()}`, // Generar UUID simple
            codigo: producto.sku,
            nombre: producto.nombre,
            descripcion: `Ingrediente: ${producto.nombre}`,
            densidad: 1.0, // Valor por defecto (g/ml)
            costo: 0, // Valor por defecto
            stockActual: producto.stockActual,
            stockMinimo: 100,
          },
        })
      )

      await Promise.all(promises)
      console.log(`[Inventory] ${INVENTARIO_INICIAL.length} ingredientes insertados`)
    } else {
      console.log(`[Inventory] Tabla ya contiene ${count} ingredientes`)
    }
  } catch (error) {
    console.error("[Inventory] Error al sembrar inventario:", error)
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

    // Actualizar stock (transaccional)
    await prisma.ingrediente.update({
      where: { codigo: sku },
      data: {
        stockActual: {
          decrement: gramos,
        },
      },
    })

    console.log(`[Inventory] Stock descuentado: ${sku} -${gramos}g (nuevo total: ${ingrediente.stockActual - gramos}g)`)
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

export default {
  getAllProducts,
  seedInitialInventory,
  handleUsage,
  resetInventory,
}
