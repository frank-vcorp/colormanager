# FIX-20260127-04: Actualización de Preload.ts

**Fecha:** 2026-01-27  
**ID:** FIX-20260127-04  
**Tipo:** Fix / Actualización de Exposición de API  
**Estado:** ✅ Completado  

## Resumen

Se actualizó el archivo `src/main/ipc/preload.ts` para exponer correctamente los métodos de inventario y las funciones de mezcla que el frontend espera a través de la interfaz `Window.colorManager`.

## Cambios Realizados

### 1. ✅ Corrección de Listener de Receta Detectada
- **Antes:** `ipcRenderer.on(IPCChannels.SESION_ACTUALIZADA, ...)`
- **Después:** `ipcRenderer.on(IPCChannels.RECETA_DETECTADA, ...)`
- **Justificación:** El parser del Sayer service emite el evento `RECETA_DETECTADA` (verificado en `src/main/services/sayer-service.ts:236`). El cambio anterior era incorrecto.

### 2. ✅ Agregación de Métodos de Inventario
```typescript
obtenerInventario: () => ipcRenderer.invoke(IPCInvokeChannels.OBTENER_INVENTARIO),
resetearInventario: () => ipcRenderer.invoke(IPCInvokeChannels.RESETEAR_INVENTARIO),
```
- Handler confirmado en `src/main/main.ts` líneas 113 y 128

### 3. ✅ Agregación de Métodos de Mezcla
```typescript
guardarMezcla: (registro: any) => ipcRenderer.invoke(IPCInvokeChannels.GUARDAR_MEZCLA, registro),
obtenerHistorial: () => ipcRenderer.invoke(IPCInvokeChannels.OBTENER_HISTORIAL),
```
- **Estado:** Canales definidos en `src/shared/types.ts` (líneas 110-111)
- **Nota Importante:** Los handlers para estos métodos NO ESTÁN IMPLEMENTADOS en `src/main/main.ts` (ver sección Deuda Técnica)

## Validaciones

### Verificación de Firmas
Se compararon las firmas del preload con las definidas en `src/renderer/types/electron.d.ts`:

| Método | Preload | Esperado | ✅ Match |
|--------|---------|----------|---------|
| `onPesoActualizado` | `(cb: PesoEvent) => void` | `(cb: PesoEvent) => void \| (() => void)` | ✅ |
| `onRecetaDetectada` | `(cb: RecetaSayer) => void` | `(cb: RecetaSayer) => void \| (() => void)` | ✅ |
| `onError` | `(cb: string) => void` | `(cb: Error \| string) => void \| (() => void)` | ✅ |
| `onEstadoBascula` | `(cb: {...}) => void` | `(cb: {...}) => void \| (() => void)` | ✅ |
| `obtenerInventario` | `() => Promise<Producto[]>` | `() => Promise<Producto[]>` | ✅ |
| `resetearInventario` | `() => Promise<Producto[]>` | `() => Promise<Producto[]>` | ✅ |
| `guardarMezcla` | `(r: any) => Promise<...>` | `(r: RegistroMezcla) => Promise<RegistroMezcla>` | ✅ |
| `obtenerHistorial` | `() => Promise<...>` | `() => Promise<RegistroMezcla[]>` | ✅ |

### Compilación
- ✅ Vite build: SUCCESS (Renderer compila sin errores)
- ✅ TypeScript resolución de imports: OK
- ✅ Alias `@shared/types` resuelve correctamente

## Deuda Técnica ⚠️

### Handlers Faltantes
Los siguientes handlers están expuestos en el preload pero NO TIENEN IMPLEMENTACIÓN en `src/main/main.ts`:

1. **`GUARDAR_MEZCLA`** - Canal definido en `src/shared/types.ts:110`
   - Usado por: `src/renderer/components/SessionController.tsx`
   - Necesario para: Persistir registros de mezcla en BD

2. **`OBTENER_HISTORIAL`** - Canal definido en `src/shared/types.ts:111`
   - Usado por: `src/renderer/components/HistoryView.tsx`
   - Necesario para: Recuperar historial de mezclas

**Recomendación:** Crear task IMPL para implementar estos handlers en `src/main/main.ts` utilizando `src/main/database/db.ts`.

## Archivos Modificados

- [src/main/ipc/preload.ts](src/main/ipc/preload.ts)
  - Línea 5: Actualizar ID a `FIX-20260127-04`
  - Línea 20: Cambiar canal de `SESION_ACTUALIZADA` a `RECETA_DETECTADA`
  - Líneas 37-40: Agregar métodos de inventario y mezcla

## Testing

### Manual Testing en Dev Mode
```bash
pnpm dev
# Verificar en DevTools console:
# console.log(window.colorManager.obtenerInventario)
# console.log(window.colorManager.resetearInventario)
# console.log(window.colorManager.guardarMezcla)
# console.log(window.colorManager.obtenerHistorial)
```

### Integración
- [ ] Implementar handlers en main.ts
- [ ] Prueba E2E de flujo completo: Mezcla → Guardar → Historial
- [ ] Prueba E2E de inventario: Obtener → Resetear

## Soft Gates

| Gate | Estado | Nota |
|------|--------|------|
| **Compilación** | ✅ PASS | Vite build success, TypeScript OK |
| **Testing** | ⚠️ PARTIAL | Métodos expuestos, handlers faltantes |
| **Revisión** | ✅ PASS | Firmas coinciden con electron.d.ts |
| **Documentación** | ✅ PASS | Este checkpoint |

**Bloqueo:** Requiere implementación de handlers para completar Gate Testing.

## Referencias

- `PROYECTO.md` - Sprint planning
- `context/SPEC-CODIGO.md` - Estándares de código
- `src/shared/types.ts` - Definición de canales IPC
- `src/renderer/types/electron.d.ts` - Contrato de API

---

**Próximos Pasos:**
1. Implementar handlers `GUARDAR_MEZCLA` y `OBTENER_HISTORIAL` (task IMPL)
2. Ejecutar suite de pruebas E2E
3. Validar integración frontend-backend en contexto de mezcla real
