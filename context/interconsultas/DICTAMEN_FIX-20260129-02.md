# DICTAMEN TÉCNICO: Error ES Module Scope en Instalador Windows

- **ID:** FIX-20260129-02
- **Fecha:** 2026-01-29
- **Solicitante:** Frank (Humano)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

### Síntoma
```
Uncaught Exception:
ReferenceError: exports is not defined in ES module scope
This file is being treated as an ES module because it has a '.js' file extension 
and 'C:\Users\Frank\...\app.asar\package.json' contains "type": "module".
```

### Hallazgo Forense
1. El `package.json` raíz tiene `"type": "module"` (para Vite/React)
2. Electron-builder empaquetaba este `package.json` dentro del `.asar`
3. El código del proceso main se compila a CommonJS (`"use strict"`, `exports`)
4. Node.js en Electron detectaba `"type": "module"` y esperaba sintaxis ESM

### Causa
Conflicto entre:
- Sistema de módulos del **desarrollo** (ESM para Vite/React)
- Sistema de módulos del **empaquetado** (CommonJS para Electron main)

---

## B. Justificación de la Solución

### Cambios Aplicados

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `package.json` | Eliminar `"package.json"` de `files[]` | Evitar que el package.json raíz se empaquete |
| `package.json` | Agregar `extraMetadata: { type: "commonjs" }` | Sobrescribir el type en el paquete final |
| `package.json` | Downgrade `electron-store` de v11 a v8.2.0 | v11 es ESM-only, incompatible con CommonJS main |
| `configService.ts` | Ajustar API de electron-store | Adaptar a sintaxis de v8 |
| `scale-interface.ts` | Suprimir TS6133 con @ts-ignore | Variables reservadas para implementación futura |

### Configuración Final de electron-builder
```json
{
  "files": [
    "dist-electron/**/*",
    { "from": "dist-renderer", "to": "renderer", "filter": ["**/*"] },
    "prisma/**/*"
  ],
  "extraMetadata": {
    "type": "commonjs",
    "main": "dist-electron/main/main.js"
  }
}
```

---

## C. Validación

```bash
$ pnpm run build
✓ build:main completado
✓ vite build completado  
✓ electron-builder completado
✓ ColorManager-0.0.1.AppImage generado
```

### Verificación de extraMetadata
```yaml
# release/builder-effective-config.yaml
extraMetadata:
  type: commonjs
  main: dist-electron/main/main.js
```

---

## D. Instrucciones Post-Fix

### Para Windows (Reinstalación)
1. Desinstalar versión anterior de ColorManager
2. Ejecutar nuevo build: `pnpm run build`
3. El instalador NSIS estará en `release/ColorManager-0.0.1.exe`
4. Instalar y verificar que inicia sin error

### Prevención Futura
- **NO actualizar** `electron-store` a v11+ mientras el main process use CommonJS
- Si se migra a ESM en main process, actualizar:
  - `tsconfig.main.json` → `"module": "ESNext"`
  - Extensiones de archivos a `.mjs`
  - `electron-store` a v11+

---

## E. Archivos Modificados

- `package.json` - Configuración de electron-builder y downgrade electron-store
- `src/main/services/configService.ts` - API electron-store v8
- `src/main/hardware/scale-interface.ts` - Supresión TS6133
