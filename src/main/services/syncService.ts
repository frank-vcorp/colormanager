/**
 * Servicio de Sincronización de Inventario con Nube (Railway)
 * Lee inventario desde Prisma y envía batch al endpoint cloud
 *
 * ID Intervención: IMPL-20260128-03
 * Referencia: context/specs/SPEC-SYNC-RAILWAY.md
 */

import { getPrismaClient } from "../database/db"
import { randomUUID } from "crypto"

/**
 * Interfaz para los datos a sincronizar
 */
interface InventarioSync {
  nodeId: string
  timestamp: string
  items: Array<{
    sku: string
    nombre: string
    stockActual: number
    costo: number
  }>
}

/**
 * Respuesta del endpoint de sincronización
 */
interface SyncResponse {
  success: boolean
  processed?: number
  error?: string
}

/**
 * Sincroniza el inventario local con el servidor cloud
 * Lee todos los ingredientes, construye el payload y lo envía
 * Guarda el resultado en SyncLog para auditoría
 *
 * @param nodeId - Identificador único del nodo (ej: "TALLER-PC01")
 * @returns {Promise<SyncResponse>} Respuesta del servidor o error
 */
export async function syncInventory(nodeId: string = "TALLER-PC01"): Promise<SyncResponse> {
  try {
    const prisma = getPrismaClient()

    // 1. Leer todos los ingredientes (inventario) desde BD
    const ingredientes = await prisma.ingrediente.findMany({
      select: {
        codigo: true,
        nombre: true,
        stockActual: true,
        costo: true,
      },
    })

    if (ingredientes.length === 0) {
      throw new Error("No hay ingredientes en el inventario para sincronizar")
    }

    // 2. Construir payload según especificación
    const payload: InventarioSync = {
      nodeId,
      timestamp: new Date().toISOString(),
      items: ingredientes.map((ing: { codigo: string; nombre: string; stockActual: number; costo: number }) => ({
        sku: ing.codigo,
        nombre: ing.nombre,
        stockActual: ing.stockActual,
        costo: ing.costo,
      })),
    }

    // 3. Obtener URL del endpoint desde variables de entorno
    const syncApiUrl = process.env.SYNC_API_URL
    if (!syncApiUrl) {
      throw new Error("SYNC_API_URL no configurada en .env")
    }

    // 4. Enviar batch al endpoint cloud
    const response = await fetch(`${syncApiUrl}/api/inventory/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Error en respuesta del servidor (${response.status}): ${errorText}`
      )
    }

    const result = (await response.json()) as SyncResponse

    // 5. Registrar en SyncLog para auditoría
    await prisma.syncLog.create({
      data: {
        id: randomUUID(),
        tabla: "Inventario",
        accion: "SYNC",
        registroId: "BATCH-SYNC",
        nodeId: nodeId,
        cambios: JSON.stringify({
          nodeId,
          itemsCount: ingredientes.length,
          success: result.success,
          processed: result.processed,
          timestamp: payload.timestamp,
        }),
      },
    })

    return {
      success: result.success,
      processed: result.processed || ingredientes.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Registrar error en SyncLog
    try {
      const prisma = getPrismaClient()
      await prisma.syncLog.create({
        data: {
          id: randomUUID(),
          tabla: "Inventario",
          accion: "SYNC_ERROR",
          registroId: "BATCH-ERROR",
          nodeId: "TALLER-PC01",
          cambios: JSON.stringify({
            nodeId: "TALLER-PC01",
            error: errorMessage,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch {
      // Si falla el registro del error, solo loguear en consola
      console.error("[SyncService] Error al registrar error en SyncLog:", error)
    }

    console.error("[SyncService] Error en sincronización:", errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
