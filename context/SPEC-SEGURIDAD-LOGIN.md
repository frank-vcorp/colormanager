# SPEC-SEGURIDAD-LOGIN: Sistema de Autenticación y Roles

> **ID:** ARCH-20260128-04
> **Fecha:** 2026-01-28
> **Sprint:** 3.1
> **Prioridad:** Alta (Bloqueante para producción)

## 1. Objetivo
Implementar un sistema de control de acceso local para que solo usuarios autorizados puedan operar la aplicación, y solo administradores puedan realizar acciones sensibles (ajustes de inventario, configuración).

## 2. Alcance
- Modelo de Datos para Usuarios (`User`).
- Pantalla de Login al iniciar la aplicación.
- Protección de Rutas (Route Guards).
- Control de visibilidad de botones sensibles (UI) basado en Rol.
- Log de auditoría: Asociar `User` a las mezclas y ajustes (si es posible en este sprint, si no, dejar preparado).

## 3. Arquitectura

### 3.1 Modelo de Datos (Prisma)
```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String   // Hashed (bcrypt)
  role      String   // "ADMIN", "OPERADOR"
  nombre    String
  createdAt DateTime @default(now())
  active    Boolean  @default(true)
}

// Futuro relation: Mezcla -> User
// Futuro relation: SyncLog -> User
```

### 3.2 Backend (Main Process)
- **Tech:** `bcryptjs` para hashing.
- **Service:** `AuthService`.
  - `login(username, password)`: Valida y retorna token/session.
  - `seedDefaultAdmin()`: Crea `admin` / `admin123` si no existen usuarios.
- **IPC Channels:**
  - `auth:login` (Invoke) -> { success, user, token }
  - `auth:logout` (Send)
  - `auth:check` (Invoke) -> { user | null }

### 3.3 Frontend (Renderer)
- **Context:** `AuthProvider` que mantiene el estado `currentUser`.
- **View:** `LoginView.tsx`.
- **Component:** `ProtectedRoute` para envolver rutas.
- **Hook:** `useAuth()` para acceder a `user.role` en componentes.

## 4. Plan de Implementación (Micro-Sprint)

### Tarea 1: Base de Datos y Backend
1.  Instalar `bcryptjs` y `@types/bcryptjs`.
2.  Actualizar `schema.prisma`.
3.  Ejecutar migración (`prisma migrate dev`).
4.  Crear `AuthService` con lógica de hash y validación.
5.  Crear script de seed automático en el arranque (`main.ts` -> `AuthService.init()`) para asegurar que siempre haya un admin inicial.

### Tarea 2: API IPC
1.  Registrar handlers en `ipcMain`.
2.  Definir tipos en `preload` y `window.d.ts`.

### Tarea 3: Frontend - Login y Contexto
1.  Crear `LoginView` (simple: usuario/pass).
2.  Implementar `AuthProvider`.
3.  Modificar `App.tsx` para mostrar Login si no hay sesión.

### Tarea 4: Restricciones de UI
1.  Ocultar/Deshabilitar botón "Ajustar Stock" en `InventoryView` si `role !== 'ADMIN'`.
2.  Ocultar botón "Importar" si `role !== 'ADMIN'`.
3.  El botón "Imprimir" y "Mezclar" siguen abiertos para `OPERADOR`.

## 5. Criterios de Aceptación
- [ ] Al abrir la app, pide Login.
- [ ] `admin` / `admin123` permite entrar.
- [ ] Credenciales incorrectas muestran error.
- [ ] Un usuario `OPERADOR` puede mezclar pero NO puede ver botón "Ajustar Stock".
- [ ] Un usuario `ADMIN` ve todo.
- [ ] Reiniciar la app mantiene la sesión (o pide login de nuevo, decisión: pedir login por seguridad en taller). -> **Decisión:** Persistir sesión es arriesgado en taller compartido. **No persistir** entre reinicios completos de la app, o usar un token de sesión corto. Para MVP: Sesión en memoria de Main process (se pierde al cerrar app).

## 6. Seguridad
- Passwords nunca se guardan en texto plano.
- No hay recuperación de contraseña por email (app local). Solo otro Admin puede resetear (fuera de alcance de este sprint, usar DB directa si se pierde).
