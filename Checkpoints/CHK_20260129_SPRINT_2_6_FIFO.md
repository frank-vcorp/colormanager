# CHECKPOINT: Sprint 2.6 - Gestión FIFO y Lotes

**Fecha:** 2026-01-29
**ID Intervención:** IMPL-20260129-03
**Estado:** [✓] Completado

## 📋 Resumen
Sistema de gestión de inventario actualizado para soportar el principio FIFO (Primero en Entrar, Primero en Salir). Se implementó un modelo de datos `Lote` relacionado con `Ingrediente`.

## 🔄 FIFO en Acción
1.  **Modelo de Datos:**
    -   `Ingrediente` 1 --- N `Lote`.
    -   Cada lote tiene `numeroLote`, `cantidad`, `estado` y `createdAt`.
2.  **Lógica Backend:**
    -   `consumirStockFIFO`: Algoritmo que descuenta stock en cascada. Si tienes 2 lotes de 100g y necesitas 150g, agota el primero y toma 50g del segundo.
    -   `importarInventario`: Al detectar aumento de stock, crea un nuevo lote `SICAR-[FECHA]`. Al detectar disminución, consume FIFO.
    -   `ajustarStock`: Ingresos manuales crean lotes `ADJ-[FECHA]`. Salidas consumen FIFO.
3.  **Interfaz Frontend:**
    -   Tabla `InventoryView` ahora es expandible.
    -   Clic en producto -> Visualizar todos sus lotes activos.

## 🧪 Pruebas Realizadas
- [x] Migración DB correcta (Relación + Tabla Lote).
- [x] Importación masiva crea lotes iniciales.
- [x] Ajuste manual (+) crea nuevo lote.
- [x] Ajuste manual (-) consume del lote más viejo.
- [x] Visualización de lotes en UI.

## 📝 Notas para Instalación
- Requiere ejecutar `npx prisma migrate deploy` si se instala en un entorno que ya tenía DB.
- Por defecto, el inventario previo se migra a un "LOTE-INICIAL" (gestionado por seed/migración).
