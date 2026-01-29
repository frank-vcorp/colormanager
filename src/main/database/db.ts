/**
 * Singleton de Prisma Client
 * Gestiona la conexión única a la base de datos SQLite
 *
 * ID Intervención: IMPL-20260127-08
 * FIX REFERENCE: FIX-20260129-02 - Configuración de paths para producción Electron
 * Referencia: context/Contexto_Tecnico_ColorManager.md
 */

import { PrismaClient } from "@prisma/client"
import path from "path"
import { app } from "electron"
import fs from "fs"

let prismaInstance: PrismaClient | null = null

/**
 * Determina si estamos en entorno de desarrollo
 */
function isDev(): boolean {
  return process.env.NODE_ENV === "development" || !app.isPackaged
}

/**
 * Obtiene la ruta al Query Engine de Prisma según el entorno
 * FIX REFERENCE: FIX-20260129-02 - Resuelve paths de Query Engine en producción
 */
function getPrismaEngineDirectory(): string {
  if (isDev()) {
    // En desarrollo, el cliente está en node_modules
    return path.join(process.cwd(), "node_modules", ".prisma", "client")
  }
  
  // En producción, el engine está en resources/prisma-client (extraResources)
  const resourcesPath = process.resourcesPath
  const enginePath = path.join(resourcesPath, "prisma-client")
  
  // Fallback: buscar en app.asar.unpacked
  const unpackedPath = path.join(resourcesPath, "app.asar.unpacked", "node_modules", ".prisma", "client")
  
  if (fs.existsSync(enginePath)) {
    console.log(`[DB] Query Engine encontrado en: ${enginePath}`)
    return enginePath
  }
  
  if (fs.existsSync(unpackedPath)) {
    console.log(`[DB] Query Engine encontrado en unpacked: ${unpackedPath}`)
    return unpackedPath
  }
  
  console.warn(`[DB] ADVERTENCIA: No se encontró Query Engine en paths esperados`)
  return enginePath // Retornamos el path esperado para que Prisma muestre error descriptivo
}

/**
 * Obtiene o crea la instancia singleton de PrismaClient
 * En desarrollo: usa process.cwd() + '/prisma/dev.db'
 * En producción: usa app.getPath('userData') + '/colormanager.db'
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const inDev = isDev()

    // Ruta de la base de datos
    const dbPath = inDev
      ? path.join(process.cwd(), "prisma", "dev.db")
      : path.join(app.getPath("userData"), "colormanager.db")

    // Asegurar que el directorio userData existe en producción
    if (!inDev) {
      const userDataDir = app.getPath("userData")
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true })
      }
    }

    // Configurar la variable de entorno para el Query Engine
    // FIX REFERENCE: FIX-20260129-02 - Configura PRISMA_QUERY_ENGINE_LIBRARY para producción
    if (!inDev) {
      const engineDir = getPrismaEngineDirectory()
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
        engineDir, 
        `libquery_engine-${process.platform === 'win32' ? 'windows' : 'debian-openssl-3.0.x'}.${process.platform === 'win32' ? 'dll.node' : 'so.node'}`
      )
      console.log(`[DB] Query Engine configurado: ${process.env.PRISMA_QUERY_ENGINE_LIBRARY}`)
    }

    console.log(`[DB] Conectando a SQLite en: ${dbPath}`)

    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
      log: inDev ? ["query", "info", "warn"] : ["error"],
    })
  }

  return prismaInstance
}

/**
 * Cierra la conexión de Prisma (llamar al finalizar)
 */
export async function closePrismaClient(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect()
    prismaInstance = null
    console.log("[DB] Conexión a Prisma cerrada")
  }
}

export default getPrismaClient
