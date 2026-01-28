/**
 * Singleton de Prisma Client
 * Gestiona la conexión única a la base de datos SQLite
 *
 * ID Intervención: IMPL-20260127-08
 * Referencia: context/Contexto_Tecnico_ColorManager.md
 */

import { PrismaClient } from "@prisma/client"
import path from "path"
import { app } from "electron"

let prismaInstance: PrismaClient | null = null

/**
 * Obtiene o crea la instancia singleton de PrismaClient
 * En desarrollo: usa process.cwd() + '/prisma/dev.db'
 * En producción: usaría app.getPath('userData')
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    // Asegurarse de que estamos en el contexto correcto
    const isDevelopment = process.env.NODE_ENV === "development" || !app.isReady()

    // Para desarrollo, usamos la ruta relativa al directorio del proyecto
    // Para producción, se usaría app.getPath('userData') + '/dev.db'
    const dbPath = isDevelopment
      ? path.join(process.cwd(), "prisma", "dev.db")
      : path.join(app.getPath("userData"), "dev.db")

    console.log(`[DB] Conectando a SQLite en: ${dbPath}`)

    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["query", "info", "warn"] : ["error"],
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
