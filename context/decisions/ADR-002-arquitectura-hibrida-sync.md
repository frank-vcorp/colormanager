# ADR-002: Arquitectura Híbrida (Local First + Cloud Sync)

**Fecha:** 2026-01-27
**Estado:** PROPUESTO

## Contexto
El cliente requiere que el administrador pueda consultar reportes (inventarios, mermas, ventas) vía Web desde cualquier lugar.
Sin embargo, el taller de igualación es un entorno de producción crítica: si el sistema falla o se vuelve lento por latencia de red, se detiene la producción de pintura.

## Opciones Consideradas

### 1. Base de Datos 100% en Nube (Railway/Postgres)
*   **Pros:** Datos centralizados, acceso web nativo, sin duplicidad.
*   **Contras:** Dependencia total de internet. Si se cae la red, no se puede pesar ni facturar. Latencia en validaciones de escáner. **RIESGO ALTO DE PARO OPERATIVO.**

### 2. Base de Datos Local con Acceso Remoto
*   **Pros:** Velocidad local.
*   **Contras:** Exponer el puerto de la PC del taller a internet es inseguro y complejo (VPNs, IPs fijas).

### 3. Modelo Híbrido de Sincronización (Elección)
*   **Descripción:** La app Electron usa SQLite localmente. Un servicio en segundo plano ("Sync Agent") envía los registros nuevos a una BD en Railway (Postgres) cuando hay conexión.
*   **Pros:** 
    *   **Robustez:** El taller sigue operando aunque no haya internet (Offline First).
    *   **Velocidad:** Las lecturas del escáner son instantáneas (0ms latencia).
    *   **Acceso Web:** El admin ve los datos (con ligero retraso de segundos/minutos) en la web.
*   **Contras:** Mayor complejidad de desarrollo (hay que programar la sincronización).

## Decisión
Adoptamos el **Modelo Híbrido de Sincronización**.
1.  **Operación Taller:** SQLite (Source of Truth operativa).
2.  **Reportes Web:** PostgreSQL en Railway (Read-Only Replica para Admin).
3.  **Dashboard Web:** Next.js hosteado en Vercel leyendo de Railway.

## Consecuencias
*   Se agregan al Stack: PostgreSQL, Prisma (Multi-provider), Next.js.
*   Se agrega tarea al Roadmap: "Implementar Background Sync Service".
