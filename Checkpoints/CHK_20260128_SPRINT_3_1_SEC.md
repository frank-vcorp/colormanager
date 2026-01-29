# CHECKPOINT: Sprint 3.1 - Seguridad y Roles

**Fecha:** 2026-01-28
**ID Intervención:** IMPL-20260128-04
**Estado:** [✓] Completado

## 📋 Resumen
Se implementó el sistema de autenticación completo (Backend + Frontend + DB) para asegurar que solo usuarios autorizados accedan a la aplicación, y restringir operaciones críticas (Inventario) a Administradores.

## 🔒 Seguridad Implementada
1.  **Modelo User:**
    - Tabla `User` en SQLite con hashing de contraseñas (`bcryptjs`).
    - Roles: `ADMIN` y `OPERADOR`.
2.  **Autenticación:**
    - Login Screen obligatorio al inicio.
    - Sesión en memoria del proceso Main (se cierra al salir de la app).
    - Seed automático: Usuario `admin` creado por defecto.
3.  **Control de Acceso (RBAC):**
    - `AuthProvider` en React expone `user` y `isAdmin`.
    - **Inventario:**
        - Botón "Importar SICAR": Solo ADMIN.
        - Botón "Resetear Stock": Solo ADMIN.
        - Botón "Ajustar Stock": Solo ADMIN.
        - Botón "Imprimir": TODOS (Operador necesita etiquetar).

## 🛠️ Detalles Técnicos
- **Backend:** `src/main/services/authService.ts` gestiona logica de negocio.
- **Frontend:** `useAuth` hook simplifica la verificación de permisos.
- **IPC:** Nuevos canales `auth:login` y `auth:check`.

## 🧪 Pruebas Realizadas
- [x] Login con credenciales incorrectas -> Muestra error.
- [x] Login con `admin` / `admin123` -> Entra correctamente.
- [x] Vista de Inventario como Admin -> Botones visibles.
- [x] (Simulación) Vista de inventario como Operador -> Botones ocultos.

## 📝 Notas para Instalación
- Al iniciar por primera vez, la migración crea la tabla User.
- El usuario por defecto es **admin** / **admin123**.
- Se recomienda cambiar la contraseña o crear usuarios reales mediante script DB (feature de gestión de usuarios UI pendiente para siguientes sprints).
