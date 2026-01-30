# DICTAMEN TÉCNICO: Import directo de @prisma/client causa error en producción
- **ID:** FIX-20260130-01
- **Fecha:** 2026-01-30
- **Solicitante:** SOFIA/Usuario
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz

**Síntoma:**
```
Cannot find module '.prisma/client/default'
```
El error ocurría al ejecutar la aplicación empaquetada (AppImage), específicamente en `authService.js`.

**Hallazgo Forense:**
El archivo `src/main/services/authService.ts` contenía:
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

Este import directo hacía que Electron buscara el cliente Prisma en la ubicación estándar de node_modules (`@prisma/client`), la cual no existe en el bundle empaquetado.

**Causa:**
- El proyecto tiene un sistema centralizado de gestión de Prisma en `src/main/database/db.ts` que:
  1. En desarrollo: carga de `generated/prisma-client/`
  2. En producción: carga desde `process.resourcesPath/prisma-client`
- `authService.ts` no usaba este sistema centralizado, creando su propia instancia con el import estándar.

### B. Justificación de la Solución

**Cambios Aplicados:**

1. **Eliminado import directo:**
   ```typescript
   // ANTES
   import { PrismaClient } from '@prisma/client'
   const prisma = new PrismaClient()
   
   // DESPUÉS
   import { getPrismaClient } from '../database/db'
   const getPrisma = () => getPrismaClient()
   ```

2. **Actualizado uso del cliente:**
   - Cada método ahora obtiene el cliente dinámicamente: `const prisma = getPrisma()`
   - Esto garantiza que se use el singleton configurado correctamente según el entorno.

3. **Eliminado método `disconnect()`:**
   - El ciclo de vida del cliente Prisma es responsabilidad del singleton en `db.ts`
   - Eliminarlo evita desconexiones accidentales que afecten a otros servicios.

4. **Añadida marca FIX REFERENCE** en el JSDoc del archivo.

### C. Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/main/services/authService.ts` | Refactorizado para usar `getPrismaClient()` |

### D. Validación

- [x] Sin errores de TypeScript
- [x] Import de `@prisma/client` eliminado de todos los archivos excepto `db.ts`
- [x] Cumple con SPEC-CODIGO.md (singleton pattern)

### E. Recomendación Post-Fix

Para prevenir regresiones, añadir una regla de ESLint que prohíba imports directos de `@prisma/client` fuera de `db.ts`:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [{
        "name": "@prisma/client",
        "message": "Usar getPrismaClient() de src/main/database/db.ts"
      }]
    }]
  },
  "overrides": [{
    "files": ["src/main/database/db.ts"],
    "rules": { "no-restricted-imports": "off" }
  }]
}
```
