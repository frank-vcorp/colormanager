# DICTAMEN TÉCNICO: Fallo de Electron en Contenedor - Conflicto ESM/CJS + Entorno Headless

- **ID:** FIX-20260127-04
- **Fecha:** 2026-01-27
- **Solicitante:** INTEGRA (ARCH-20260127-04)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

### Síntoma Observable
Al ejecutar `pnpm dev`, se observaron tres tipos de errores encadenados:

1. **Error de módulo ESM/CJS:**
   ```
   ReferenceError: exports is not defined in ES module scope
   This file is being treated as an ES module because package.json contains "type": "module"
   ```

2. **Error de DBus:**
   ```
   Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket
   ```

3. **Error de X11:**
   ```
   Missing X server or $DISPLAY
   The platform failed to initialize. Exiting.
   ```

### Hallazgo Forense

| # | Problema | Causa |
|---|----------|-------|
| 1 | **Conflicto ESM/CJS** | `package.json` declara `"type": "module"` (ESM), pero `tsconfig.main.json` compila con `"module": "CommonJS"`. El archivo resultante `dist-electron/main/main.js` usa `exports` y `require()` que son incompatibles con el contexto ESM. |
| 2 | **Path Alias no resuelto** | El import `@shared/types` no se traduce correctamente en la compilación tsc. TypeScript paths NO son resueltos automáticamente por tsc sin un bundler o herramienta adicional (tsconfig-paths, tsc-alias). |
| 3 | **Entorno sin X11/DBus** | El contenedor dev no tiene servidor X11 ni DBus. Electron requiere pasar a modo headless o usar Xvfb. |

### Causa Raíz Principal
**El conflicto ESM/CJS es el bloqueante crítico.** Node.js intenta cargar `main.js` como módulo ES (por `"type": "module"` en package.json), pero el archivo compilado tiene sintaxis CommonJS (`exports`, `require`).

---

## B. Justificación de la Solución

### Opción Elegida: Cambiar extensión de salida a `.cjs`

Renombrar el archivo de salida a `.cjs` es la forma más limpia porque:
1. No requiere cambiar `"type": "module"` (necesario para Vite/React)
2. Electron puede cargar archivos `.cjs` sin problemas
3. Mantiene compatibilidad con el ecosistema actual

### Cambios Requeridos

| Archivo | Cambio |
|---------|--------|
| `tsconfig.main.json` | No cambia (seguimos compilando a CJS) |
| `package.json` | Cambiar `main` y `dev` script para apuntar a `.cjs` |
| **Nuevo:** script postbuild | Renombrar `.js` → `.cjs` tras compilación |
| **Solución path alias** | Usar rutas relativas en lugar de `@shared/*` o agregar `tsc-alias` |

### Para Entorno Headless (Contenedor)
- Usar variable `ELECTRON_DISABLE_GPU=1` 
- Usar `--disable-gpu --no-sandbox` (ya presente)
- O instalar Xvfb para GUI virtual (opcional)

---

## C. Instrucciones de Handoff para SOFIA/Arquitecto

### Paso 1: Corregir tsconfig.main.json
Agregar configuración para que los path aliases se resuelvan correctamente, o cambiar a imports relativos.

### Paso 2: Modificar package.json

```json
{
  "main": "dist-electron/main/main.cjs",
  "scripts": {
    "dev": "concurrently \"npm run build:main -- -w\" \"vite\" \"wait-on http://localhost:5173 && wait-on dist-electron/main/main.cjs && ELECTRON_DISABLE_GPU=1 electron . --no-sandbox --disable-gpu\"",
    "build:main": "tsc -p tsconfig.main.json && node -e \"require('fs').renameSync('dist-electron/main/main.js','dist-electron/main/main.cjs')\""
  }
}
```

### Paso 3: Corregir imports con path alias
Cambiar en `src/main/main.ts`:
```typescript
// DE:
import { IPCChannels, IPCInvokeChannels } from "@shared/types"

// A:
import { IPCChannels, IPCInvokeChannels } from "../shared/types"
```

Repetir para todos los archivos en `src/main/` que usen `@shared/*`.

### Paso 4: Recompilar y probar
```bash
pnpm dev
```

---

## D. Validación Contra SPEC-CODIGO.md

| Criterio | Cumple |
|----------|--------|
| No introduce dependencias nuevas innecesarias | ✅ |
| Solución mínimamente invasiva | ✅ |
| Mantiene compatibilidad con build de producción | ✅ |
| Documentado con ID de intervención | ✅ |

---

**FIX REFERENCE:** FIX-20260127-04
