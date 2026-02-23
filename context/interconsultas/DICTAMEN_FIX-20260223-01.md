# DICTAMEN TÉCNICO: Fallo en Módulo de Configuración
- **ID:** FIX-20260223-01
- **Fecha:** 2026-02-23
- **Solicitante:** USUARIO
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
Se reportó que el módulo "Configuración" ("SettingsView") no funcionaba y en su lugar producía un estado de espera infinito o fallas silenciosas al intentar cambiar los modos o valores de la app.
Al realizar una inspección forense en `SettingsView.tsx`, se detectó que los llamados a IPC se estaban dirigiendo al objeto `window.electron?.invoke(...)`. Sin embargo, el archivo `preload.ts` que se encarga de exponer estas funciones a través del ContextBridge define explícitamente el objeto global como `colorManager`, no como `electron`.
Dado que `window.electron` era `undefined`, todas las promesas y suscripciones de configuración simplemente no se resolvían.

### B. Justificación de la Solución
Se reemplazaron todas las instancias de `window.electron` por `window.colorManager` a lo largo de todo el archivo `SettingsView.tsx`.
Este cambio mínimo e indispensable alinea el controlador de vista (Frontend) con el proxy establecido en el Preload Script, restaurando toda la comunicación de configuración (Get, SetMode, Set, Reset, y onConfigChanged) entre el proceso Renderer y el proceso Main en Electron.
A la par, se detectaron errores residuales de tipado (`showError` no existía en `useToast`) que también fueron corregidos.

### C. Instrucciones de Handoff para USUARIO
El módulo de Configuración ya está plenamente operativo. Puedes acceder a él logeándote como Administrador y haciendo clic en el engranaje superior.

***
🛠️ **MARCA DE AGUA QA DEBY:** *FIX REFERENCE: FIX-20260223-01*
