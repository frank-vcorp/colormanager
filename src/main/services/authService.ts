/**
 * IMPL-20260128-01: AuthService - Sistema de Autenticación y Gestión de Roles
 * Ref: context/SPEC-SEGURIDAD-LOGIN.md (ARCH-20260128-04)
 * 
 * Servicio responsable de:
 * - Hash y validación de contraseñas con bcryptjs
 * - Seed inicial de usuario admin
 * - Login/logout
 * - Validación de sesiones
 */

import * as bcryptjs from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface UserSession {
  id: number
  username: string
  nombre: string
  role: 'ADMIN' | 'OPERADOR'
}

class AuthService {
  /**
   * Hash de una contraseña en texto plano
   */
  private static async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(10)
    return bcryptjs.hash(password, salt)
  }

  /**
   * Compara una contraseña en texto plano con su hash
   */
  private static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash)
  }

  /**
   * Seed automático al iniciar: verifica si existen usuarios.
   * Si la tabla está vacía, crea el usuario admin/admin123
   */
  static async seedDefaultAdmin(): Promise<void> {
    const userCount = await prisma.user.count()
    
    if (userCount === 0) {
      const hashedPassword = await this.hashPassword('admin123')
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
          nombre: 'Administrador',
          active: true,
        },
      })
      console.log('[AuthService] ✅ Usuario admin creado automáticamente')
    } else {
      console.log('[AuthService] ✅ Base de datos de usuarios ya existe')
    }
  }

  /**
   * Login: valida credenciales y retorna sesión
   */
  static async login(username: string, password: string): Promise<UserSession | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      })

      if (!user || !user.active) {
        return null
      }

      const isPasswordValid = await this.comparePassword(password, user.password)
      if (!isPasswordValid) {
        return null
      }

      return {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        role: user.role as 'ADMIN' | 'OPERADOR',
      }
    } catch (error) {
      console.error('[AuthService] Error en login:', error)
      return null
    }
  }

  /**
   * Check: valida una sesión existente
   */
  static async checkUser(userId: number): Promise<UserSession | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user || !user.active) {
        return null
      }

      return {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        role: user.role as 'ADMIN' | 'OPERADOR',
      }
    } catch (error) {
      console.error('[AuthService] Error en checkUser:', error)
      return null
    }
  }

  /**
   * Cleanup de conexiones
   */
  static async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }
}

export default AuthService
