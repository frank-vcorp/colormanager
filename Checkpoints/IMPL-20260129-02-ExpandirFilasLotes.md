# IMPL-20260129-02: Expansión de Filas para Mostrar Lotes

## Resumen
Modificación de `InventoryView.tsx` para agregar lógica de expandir filas y visualizar tabla de Lotes Activos con interfaz FIFO.

## Cambios Realizados

### 1. Importación de React
- **Antes:** `import { useState, useEffect } from "react"`
- **Ahora:** `import React, { useState, useEffect } from "react"`
- **Razón:** Permitir uso explícito de `React.Fragment` en el mapeo

### 2. Estructura del Mapeo (Inventario)
- **Cambio:** Uso de `<React.Fragment key={prod.sku}>` en lugar de `<>`
- **Ubicación:** Líneas 390-495

### 3. Componentes de Interfaz
```tsx
<React.Fragment key={prod.sku}>
  {/* Fila Principal - Clickeable */}
  <tr onClick={() => toggleExpandRow(prod.sku)} className="cursor-pointer ...">
    {/* Celdas con indicador de expansión */}
  </tr>
  
  {/* Fila Expandida - Tabla de Lotes */}
  {isExpanded && hasLotes && (
    <tr className="bg-gray-50 border-l-4 border-blue-400">
      <td colSpan={5}>
        {/* Sub-tabla de Lotes Activos */}
      </td>
    </tr>
  )}
</React.Fragment>
```

### 4. Indicadores Visuales
- **Expandido:** ▼ (triángulo hacia abajo)
- **Colapsado:** ▶ (triángulo hacia la derecha)
- **Sin lotes:** • (punto)

### 5. Tabla de Lotes Anidada
Columnas:
- **N° Lote:** Identificador del lote (numeroLote)
- **Cantidad (g):** Stock del lote con 1 decimal
- **Estado:** Badge con color según estado (activo, parcial, agotado)
- **Creado:** Fecha de creación en formato local (es-MX)

## Estado de Lotes
```
- activo    → bg-green-100 text-green-700
- parcial   → bg-yellow-100 text-yellow-700
- agotado   → bg-gray-100 text-gray-700
```

## Funciones Relacionadas
- `toggleExpandRow(sku: string)`: Alterna estado de expansión
- `cargarInventario()`: Obtiene productos con estructura `lotes[]`

## Validación
✅ **Build exitoso** - Sin errores de compilación
✅ **TypeScript** - Tipos `Lote` desde `@shared/types`
✅ **Interfaz** - Usa `Producto` con propiedad `lotes?: Lote[]`

## Gates de Calidad
- ✅ **Compilación:** Pasa pnpm build sin errores
- ⏳ **Testing:** Requiere validación manual (expandir producto con lotes)
- ⏳ **Revisión:** Código sigue estructura existente
- ⏳ **Documentación:** Este checkpoint documenta cambios

## ID de Intervención
`IMPL-20260129-02-RETRY`

## Notas
- La función `toggleExpandRow()` ya existía en el código base
- El estado `expandedRow` ya estaba declarado
- Se modificó solo la estructura de renderizado para usar `React.Fragment` explícitamente
- Compatible con sistema FIFO existente (lotes ordenados por fecha createdAt)

---
**Fecha:** 2026-01-29
**Sprint:** 2.6 FIFO - Lotes Activos
