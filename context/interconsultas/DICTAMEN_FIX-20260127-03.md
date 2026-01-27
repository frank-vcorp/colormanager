# DICTAMEN TÉCNICO: Error import "./types/electron" en App.tsx

- **ID:** FIX-20260127-03
- **Fecha:** 2026-01-27
- **Solicitante:** SOFIA (vía usuario)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz

### Síntoma
```
Failed to resolve import "./types/electron" from "src/renderer/App.tsx"
```
Vite no puede resolver el import del archivo `electron.d.ts`.

### Hallazgo Forense
1. **[App.tsx:9](../src/renderer/App.tsx#L9)** contenía:
   ```tsx
   import "./types/electron" // Carga tipos de Electron globales
   ```

2. El archivo [electron.d.ts](../src/renderer/types/electron.d.ts) existe y es válido, pero es una **definición de tipos globales** (`declare global`), NO un módulo JavaScript exportable.

3. **Error secundario detectado**: El archivo `useToast.ts` contenía JSX pero tenía extensión `.ts` en lugar de `.tsx`.

### Causa
- Los archivos `.d.ts` con `declare global` son definiciones de tipos ambient que TypeScript lee automáticamente del árbol de archivos. **No deben importarse** en código de runtime porque:
  1. No exportan nada (solo declaran tipos globales)
  2. Vite/esbuild no los reconoce como módulos válidos
  3. TypeScript ya los procesa si están en la carpeta `src/` según `tsconfig.json`

---

## B. Justificación de la Solución

### Cambios Aplicados

| Archivo | Acción | Razón |
|---------|--------|-------|
| [App.tsx](../src/renderer/App.tsx) | Eliminado `import "./types/electron"` | Los tipos globales no se importan |
| [useToast.ts → useToast.tsx](../src/renderer/hooks/useToast.tsx) | Renombrado extensión | El archivo contiene JSX (`<ToastContext.Provider>`) |

### Validación
```bash
pnpm vite build
# ✓ 47 modules transformed
# ✓ built in 3.18s
```

---

## C. Instrucciones de Handoff para SOFIA

1. **El FIX está aplicado y validado.** No se requiere acción adicional para el error reportado.

2. **Nota sobre electron-builder:** El error posterior de electron-builder (`dist-electron/main.js does not exist`) es un problema de configuración separado que requiere compilar `src/main/main.ts` a JavaScript antes del empaquetado. Esto NO es parte de este FIX.

3. **Archivos modificados:**
   - `src/renderer/App.tsx` - Eliminado import inválido
   - `src/renderer/hooks/useToast.tsx` - Renombrado desde .ts

---

## Lección Aprendida

> **Regla de Oro:** Los archivos `.d.ts` con `declare global` nunca deben importarse en código de aplicación. TypeScript los detecta automáticamente si están dentro del `include` del `tsconfig.json`.
