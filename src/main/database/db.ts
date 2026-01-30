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
 * Inicializa la base de datos creando las tablas si no existen
 * Usa $executeRawUnsafe para crear tablas SQLite directamente
 */
export async function initializeDatabase(): Promise<void> {
  const prisma = getPrismaClient()
  
  console.log("[DB] Verificando/creando tablas de base de datos...")
  
  try {
    // Crear tabla User si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'OPERADOR',
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Crear tabla Ingrediente si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Ingrediente" (
        "id" TEXT PRIMARY KEY,
        "codigo" TEXT NOT NULL UNIQUE,
        "nombre" TEXT NOT NULL,
        "descripcion" TEXT,
        "densidad" REAL NOT NULL,
        "costo" REAL NOT NULL,
        "stockActual" REAL NOT NULL,
        "stockMinimo" REAL NOT NULL DEFAULT 100,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Crear índice en Ingrediente.codigo
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Ingrediente_codigo_idx" ON "Ingrediente"("codigo")
    `)
    
    // Crear tabla Lote si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Lote" (
        "id" TEXT PRIMARY KEY,
        "ingredienteId" TEXT NOT NULL,
        "numeroLote" TEXT NOT NULL,
        "cantidad" REAL NOT NULL,
        "estado" TEXT NOT NULL DEFAULT 'activo',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente"("id") ON DELETE CASCADE
      )
    `)
    
    // Crear tabla SyncLog si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SyncLog" (
        "id" TEXT PRIMARY KEY,
        "tabla" TEXT NOT NULL,
        "accion" TEXT NOT NULL,
        "registroId" TEXT NOT NULL,
        "cambios" TEXT NOT NULL,
        "nodeId" TEXT NOT NULL,
        "sincronizado" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log("[DB] ✅ Tablas de base de datos verificadas/creadas")
  } catch (error) {
    console.error("[DB] ❌ Error al inicializar tablas:", error)
    throw error
  }
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
