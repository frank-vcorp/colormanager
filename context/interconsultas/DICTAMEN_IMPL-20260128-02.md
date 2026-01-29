# DICTAMEN TÉCNICO: Workflow de build Windows en GitHub Actions

- **ID:** IMPL-20260128-02
- **Fecha:** 2026-01-28
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

---

## A. Objetivo
Generar un instalable de Windows desde GitHub Actions usando runner Windows para evitar limitaciones de empaquetado en Linux.

## B. Propuesta
- Crear workflow con `workflow_dispatch`.
- Usar `actions/setup-node` + `pnpm/action-setup`.
- Ejecutar `pnpm install` y `pnpm run build -- --win`.
- Exportar artefactos en `dist/`.

## C. Beneficios
- Build reproducible en entorno Windows.
- Evita problemas de Wine y checksum en Linux.

---

**Respaldo asociado:** workflow en `.github/workflows/build-windows.yml`
