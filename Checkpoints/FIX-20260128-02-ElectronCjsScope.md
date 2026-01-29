# Checkpoint: Ajuste de salida CJS en Electron (Scope Main)

**ID:** FIX-20260128-02
**Fecha:** 2026-01-28

## Resumen
Se ajusta la lógica de renombrado de compilación para que solo afecte a los artefactos del proceso Main de Electron (dist-electron/main), evitando romper los módulos compartidos (dist-electron/shared) que deben permanecer en .js (CommonJS) para la resolución de imports.

## Cambios clave
- Renombrado de .js → .cjs limitado a dist-electron/main.
- Script dev:container propuesto para entorno headless con Xvfb.

## Motivación
Evitar el error de carga ESM/CJS y preservar la resolución de `require("../shared/types")` desde main.cjs.
