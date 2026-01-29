# DICTAMEN TÉCNICO: Error ESM/CJS en Electron - "exports is not defined"

- **ID:** FIX-20260128-01
- **Fecha:** 2026-01-28
- **Solicitante:** INTEGRA (ARCH-20260128-04)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

### Síntoma Reportado
```
exports is not defined in ES module scope
```
Error al ejecutar `pnpm dev` con Electron en contenedor.

### Hallazgo Forense

| Evidencia | Valor |
|-----------|-------|
| `package.json` → `"type"` | `"module"` (proyecto es ESM) |
| `tsconfig.main.json` → `"module"` | `"CommonJS"` (compila a CJS) |
| Archivos en `dist-electron/` | **Coexisten `.js` y `.cjs`** |
| Timestamps `.cjs` | `00:10` (renombrado primero) |
| Timestamps `.js` | `00:12` (regenerado después) |

**Secuencia del problema:**

```
1. tsc compila → genera *.js
2. watcher renombra → *.js → *.cjs ✓
3. tsc --watch detecta cambio → recompila → genera *.js de nuevo
4. RESULTADO: ambos *.js y *.cjs coexisten
```

**Comportamiento de Node.js con `"type": "module"`:**

```javascript
require("./hardware/mock-scale")  // Sin extensión
// Node resuelve → mock-scale.js (prioriza .js sobre .cjs)
// Node interpreta .js como ESM (por "type": "module")
// Archivo contiene "use strict"; exports.X = ...
// ERROR: "exports is not defined in ES module scope"
```

### Causa Raíz
**Race condition en el watcher**: TypeScript en modo `--watch` recompila y regenera los archivos `.js` **después** de que el script los renombre a `.cjs`, causando duplicación.

---

## B. Justificación de la Solución

### Opción 1 (RECOMENDADA): Eliminar `.js` en lugar de renombrar
Modificar el watcher para **mover** (no copiar) y asegurar que no quede `.js` residual.

### Opción 2: Usar subdirectorio con `package.json` propio
Crear `dist-electron/package.json` con `"type": "commonjs"` para forzar interpretación CJS de `.js`.

### Opción 3: Configurar TypeScript para emitir `.cjs` directamente
Requiere TypeScript 5.5+ con `--moduleResolution bundler` y extensiones explícitas.

**Se recomienda Opción 1 + Opción 2 combinadas** para máxima robustez.

---

## C. Instrucciones de Implementación

### Paso 1: Limpiar dist-electron
```bash
rm -rf dist-electron/
```

### Paso 2: Crear `dist-electron/package.json`
```json
{
  "type": "commonjs"
}
```
Esto fuerza a Node a tratar TODOS los `.js` en ese directorio como CommonJS.

### Paso 3: Actualizar `scripts/watch-main.mjs`
Reemplazar la función `renameJsToCjs` para que **elimine** los `.js` después de renombrar:

```javascript
async function renameJsToCjs(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await renameJsToCjs(fullPath);
      } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.cjs') && !entry.name.endsWith('.map')) {
        const cjsPath = fullPath.replace(/\.js$/, '.cjs');
        // Copiar contenido, luego eliminar original
        const { copyFile, unlink } = await import('fs/promises');
        await copyFile(fullPath, cjsPath);
        await unlink(fullPath);  // CRÍTICO: Eliminar el .js
        console.log(`[build:main] Converted: ${entry.name} → ${entry.name.replace('.js', '.cjs')}`);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(err);
  }
}
```

### Paso 4: Actualizar script `build:main` en `package.json`
Asegurar que también elimina los `.js` originales:
```json
"build:main": "tsc -p tsconfig.main.json && find dist-electron -name '*.js' ! -name '*.map' -exec sh -c 'mv \"$1\" \"${1%.js}.cjs\"' _ {} \\; && find dist-electron -name '*.js' ! -name '*.map' -delete"
```

### Paso 5: Validar
```bash
pnpm run build:main
ls dist-electron/main/  # NO debe haber .js (excepto .js.map)
pnpm dev
```

---

## D. Handoff para SOFIA/GEMINI

1. Aplicar los 4 pasos de corrección arriba descritos
2. El contenedor requiere `--no-sandbox --disable-gpu` (ya está en script `dev`)
3. Para X server, verificar que `DISPLAY` esté configurado o usar Xvfb para tests headless
4. Validar con `pnpm dev:headless` si no hay display disponible

---

## E. Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| `dist-electron/package.json` | **CREAR** con `{"type":"commonjs"}` |
| `scripts/watch-main.mjs` | **EDITAR** función `renameJsToCjs` |
| `package.json` | **EDITAR** script `build:main` |
| `dist-electron/**/*.js` | **ELIMINAR** (excepto `.map`) |

---

**FIX REFERENCE:** FIX-20260128-01
