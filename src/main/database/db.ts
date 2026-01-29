/**
 * Singleton de Prisma Client
 * Gestiona la conexión única a la base de datos SQLite
 *
 * ID Intervención: IMPL-20260127-08
 * FIX REFERENCE: FIX-20260129-04 - Usar cliente generado en carpeta dedicada
 * Referencia: context/Contexto_Tecnico_ColorManager.md
 */

import path from "path"
import { app } from "electron"
import fs from "fs"

// Determinar si estamos en desarrollo o producción ANTES de importar Prisma
const inDev = process.env.NODE_ENV === "development" || !app.isPackaged

// En producción, configurar las variables de entorno ANTES de importar PrismaClient
if (!inDev) {
  const resourcesPath = process.resourcesPath
  const prismaClientPath = path.join(resourcesPath, "prisma-client")
  
  // Configurar la ruta del Query Engine
  const engineName = process.platform === 'win32' 
    ? 'query_engine-windows.dll.node'
    : 'libquery_engine-debian-openssl-3.0.x.so.node'
  
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(prismaClientPath, engineName)
  
  console.log(`[DB] Producción detectada. Resources: ${resourcesPath}`)
  console.log(`[DB] Prisma Client Path: ${prismaClientPath}`)
  console.log(`[DB] Query Engine: ${process.env.PRISMA_QUERY_ENGINE_LIBRARY}`)
}

// Ahora sí importamos PrismaClient (después de configurar las variables de entorno)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = inDev 
  ? require("../../../generated/prisma-client")
  : require(path.join(process.resourcesPath, "prisma-client"))

let prismaInstance: InstanceType<typeof PrismaClient> | null = null

/**
 * Obtiene o crea la instancia singleton de PrismaClient
 * En desarrollo: usa process.cwd() + '/prisma/dev.db'
 * En producción: usa app.getPath('userData') + '/colormanager.db'
 */
export function getPrismaClient(): InstanceType<typeof PrismaClient> {
  if (!prismaInstance) {
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
