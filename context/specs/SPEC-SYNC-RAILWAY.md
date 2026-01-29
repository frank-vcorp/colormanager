# SPEC: Sync Nube (Railway)
**ID:** ARCH-20260128-01
**Estado:** Aprobado
**Micro-Sprint:** 10 (Sprint 2.3)

## 1. Objetivo
Sincronizar el inventario local (SQLite/Prisma) hacia un servicio cloud en Railway, con estado visible en UI y reintentos básicos.

## 2. Alcance
- Exportar inventario local y enviarlo a un endpoint REST.
- Registrar estado de sincronización por lote.
- UI con botón de sincronizar y feedback (Pendiente/Enviado/Error).

## 3. Endpoint Cloud (Railway)
**POST** `/api/inventory/sync`

**Request Body**:
```json
{
  "nodeId": "TALLER-PC01",
  "timestamp": "2026-01-28T00:00:00Z",
  "items": [
    {"sku":"KT-1400","nombre":"Tinte Rojo Base","stockActual":2000,"costo":0}
  ]
}
```

**Response**:
```json
{ "success": true, "processed": 6 }
```

## 4. Servicio Local
Crear `SyncService` en `src/main/services/syncService.ts`:
- `syncInventory()`
  - Leer inventario desde Prisma.
  - Enviar batch al endpoint.
  - Guardar resultado en `SyncLog`.

## 5. IPC
- `SYNC_INVENTARIO`: invoca `syncInventory()`.
- Respuesta: `{ success: boolean, processed?: number, error?: string }`.

## 6. UI
En `InventoryView`:
- Botón "Sincronizar".
- Estado visible (última sincronización y resultado).

## 7. Casos Borde
- Endpoint offline: marcar Error y permitir reintento.
- Respuesta inválida: error controlado.

## 8. Seguridad
- URL de backend en `.env` como `SYNC_API_URL`.
- No exponer credenciales en renderer.
