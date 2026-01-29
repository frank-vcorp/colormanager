# DICTAMEN TÉCNICO: Bloqueo de carga por puerto dinámico Vite

- **ID:** FIX-20260128-02
- **Fecha:** 2026-01-28
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

---

## A. Síntoma
La app “se queda cargando” al levantar en contenedor. Electron espera `http://localhost:5173`, pero Vite puede cambiar de puerto si 5173 está ocupado.

## B. Causa raíz
En `vite.config.ts` está `strictPort: false`, lo que permite que Vite arranque en otro puerto (5174/5175). El script `dev` sigue esperando el 5173, provocando espera indefinida.

## C. Solución propuesta
Forzar `strictPort: true` para evitar cambio automático de puerto, y así alinear Vite con `wait-on` y el `startUrl` de Electron.

## D. Impacto
- El arranque fallará de forma explícita si 5173 está ocupado.
- Evita “pantalla cargando” por mismatch de puertos.

---

**FIX REFERENCE:** FIX-20260128-02
