# QA Report: Sistema de Configuración Dinámica
**ID:** INFRA-20260129-01
**Fecha:** 2026-01-29
**Auditor:** GEMINI (QA/Infra)

## 1. Resumen Ejecutivo
Se ha auditado la implementación del sistema de configuración dinámica (Modo Demo vs Prod). La implementación a nivel de UI, persistencia y estructura de código es sólida y sigue los estándares. Sin embargo, se ha detectado una funcionalidad crítica faltante en el proceso principal (`main.ts`) respecto al "Hot Reload" de servicios de hardware.

## 2. Hallazgos
| Componente | Estado | Notas |
|------------|--------|-------|
| **ConfigService** | ✅ PASA | Bien estructurado, tipado fuerte, uso correcto de `electron-store`. |
| **SettingsView** | ✅ PASA | UX clara, feedback visual adecuado, manejo de errores robusto. |
| **IPC Segurity** | ✅ PASA | Canales bien definidos en `IPCInvokeChannels`. |
| **Hot Reload** | ❌ FALLA | `main.ts` no reacciona a los cambios de configuración. Al cambiar de DEMO a PROD, la app sigue usando `MockScaleService` hasta que se reinicia manualmente. |

## 3. Detalle del Defecto (Hot Reload)
El `SPEC-CONFIG-DINAMICA.md` especifica:
> "Si cambiamos de DEMO a PROD, main.ts debería destruir MockScaleService e intentar iniciar la conexión real (o viceversa) sin reiniciar la app completa"

Actualmente:
1. `SettingsView` invoca `config:setMode`.
2. `ConfigService` actualiza el archivo JSON y notifica al *Renderer*.
3. `main.ts` inicializa `scaleService` solo al arranque (`createWindow`).
4. **Consecuencia:** El usuario cree que ha cambiado a modo Producción, pero el backend sigue simulando peso.

## 4. Recomendación Técnica
Implementar un patrón Observer o EventEmmiter entre `ConfigService` y `main.ts`:
1. Hacer que `ConfigService` emita un evento interno (Node.js EventEmitter) cuando cambia el modo.
2. En `main.ts`, suscribirse a este evento.
3. Al recibir el evento:
   - Detener el servicio actual (`scaleService.stop()`).
   - Re-inicializar el servicio correcto (`initScaleService`).
   - Asignar la nueva instancia a la variable global `scaleService`.

## 5. Dictamen
**APROBADO CON RESERVAS.** Requiere corrección inmediata de la lógica de reinicio de servicios.
