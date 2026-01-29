# SPEC-FIFO-LOTES: Gestión de Inventario por Lotes (FIFO)

> **ID:** ARCH-20260129-01
> **Fecha:** 2026-01-29
> **Sprint:** 2.6
> **Prioridad:** Alta (Requerimiento de usuario)

## 1. Objetivo
Implementar una gestión de inventario basada en Lotes (Partidas) para asegurar la rotación correcta de materiales usando el principio FIFO (First-In-First-Out). El sistema debe descontar automáticamente del lote más antiguo disponible al guardar una mezcla.

## 2. Alcance
- Modificación del Schema de Base de Datos para relacionar `Ingrediente` y `Lote`.
- Lógica de negocio FIFO en `InventoryService`.
- Interfaz de usuario para visualizar lotes de un producto.
- Compatibilidad con Importación y Ajustes existentes (creación automática de lotes).

## 3. Arquitectura

### 3.1 Modelo de Datos (Prisma)
Se establecerá una relación explícita 1:N entre `Ingrediente` y `Lote`.

```prisma
model Ingrediente {
  // ... campos existentes
  lotes Lote[] // Relación 1:N
}

model Lote {
  // ... campos existentes
  ingrediente   Ingrediente @relation(fields: [ingredienteId], references: [id])
  ingredienteId String
  // ...
}
```

### 3.2 Lógica de Consumo (FIFO)
Al procesar `guardarMezcla`, en lugar de simplemente restar `stockActual` del Ingrediente:
1.  Calcular `totalConsumir` (peso final de la mezcla para ese ingrediente).
2.  Obtener lotes activos del ingrediente ordenados por `createdAt ASC` (o `fechaVencimiento ASC` si existe).
3.  Iterar sobre lotes:
    -   Si `lote.cantidad >= pendiente`: Restar pendiente del lote, actualizar estado (si llega a 0 -> 'agotado'), terminar.
    -   Si `lote.cantidad < pendiente`: Consumir todo el lote (estado -> 'agotado'), restar de pendiente, pasar al siguiente lote.
4.  Si se agotan todos los lotes y queda pendiente:
    -   Consumir lo que hay, dejar pendiente negativo? O bloquear?
    -   **Decisión:** Permitir stock negativo en el último lote ("Lote de Ajuste") o en un lote genérico si no hay stock físico, para no bloquear producción. Se generará una alerta.
    -   Actualizar también el `stockActual` total del `Ingrediente` (suma de lotes o cache).

### 3.3 Gestión de Nuevos Ingresos
-   **Importación SICAR:** Como SICAR exporta CSV con stock total (generalmente), la importación asumirá:
    -   Si existe diferencia positiva (SICAR > Local): Crear un nuevo `Lote` con el delta llamado "IMPORT-YYYYMMDD".
    -   Si existe diferencia negativa (SICAR < Local): Aplicar lógica de ajuste negativo (consumo FIFO) para igualar.
    -   Caso inicial: Crear un "Lote Inicial" con todo el stock.
-   **Ajuste Manual UI:**
    -   Ingreso (+): Pide número de lote (opcional, sino genera auto).
    -   Salida (-): Aplica FIFO automático.

## 4. Plan de Implementación (Micro-Sprint)

### Tarea 1: DB Schema & Migration
-   Agregar relaciones en `schema.prisma`.
-   Migración.

### Tarea 2: Lógica Backend (FIFO)
-   Modificar `inventoryService.ts`:
    -   `consumirStock(sku, cantidad)`: Implementar algoritmo FIFO.
    -   Actualizar `adjustStock` y `importarSicar` para manejar lotes.

### Tarea 3: UI Lotes
-   En `InventoryView`, permitir expandir una fila para ver sus lotes activos.
-   Mostrar alertas de lotes próximos a vencer (Futuro, estructura de datos preparada).

## 5. Criterios de Aceptación
-   [ ] DB tiene relación `Ingrediente` -> `Lote`.
-   [ ] Al mezclar, se descuentan gramos del lote más viejo.
-   [ ] Si un lote se acaba, salta al siguiente.
-   [ ] El stock total del ingrediente sigue siendo correcto (suma de lotes).
