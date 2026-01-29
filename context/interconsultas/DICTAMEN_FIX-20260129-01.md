# DICTAMEN TÉCNICO: Auditoría Forense Sprints 3.1 (Seguridad) y 2.6 (FIFO)

- **ID:** FIX-20260129-01
- **Fecha:** 2026-01-29
- **Solicitante:** DEBY-20260129-QA (Auto-iniciada)
- **Estado:** 🔴 CRÍTICO - REQUIERE ACCIÓN INMEDIATA

---

## A. ANÁLISIS DE CAUSA RAÍZ

### 🔴 BUG CRÍTICO #1: Código Huérfano/Corrupto en `inventoryService.ts`

**Síntoma:** El archivo [inventoryService.ts](src/main/database/inventoryService.ts#L256-L268) contiene código huérfano (líneas 256-268) que quedó de una refactorización incompleta.

**Hallazgo Forense:**
```typescript
// Líneas 256-268 - CÓDIGO HUÉRFANO (no pertenece a ninguna función):
        stockActual: {
          decrement: gramos,
        },
      },
    })

    console.log(`[Inventory] Stock descuentado: ${sku} -${gramos}g (nuevo total: ${ingrediente.stockActual - gramos}g)`)
  } catch (error) {
    console.error(`[Inventory] Error al descontar stock de ${sku}:`, error)
    throw error
  }
}
```

**Causa:** Durante la migración de `handleUsage()` a FIFO, el código antiguo no fue eliminado completamente. Este código:
1. Rompe la compilación TypeScript con errores como `Cannot find name 'gramos'`
2. Indica que hubo un merge incompleto o edición parcial

**Impacto:** ❌ El proyecto **NO COMPILA**. Bloqueante para producción.

---

### 🔴 BUG CRÍTICO #2: Función `createSyncLog` No Definida

**Síntoma:** Línea 251 referencia `createSyncLog()` que no existe.

**Hallazgo Forense:**
```typescript
await createSyncLog("Ingrediente", "UPDATE", ingrediente.id, `Stock descontado: -${gramos}g (FIFO)`)
```

**Causa:** Se asumió que existía una función helper que nunca fue implementada.

**Impacto:** ❌ Error de compilación: `Cannot find name 'createSyncLog'`

---

### 🟡 BUG MEDIO #3: Inconsistencia de Nombres en Relación Prisma

**Síntoma:** El código usa `ing.lotes` (minúscula) pero el schema Prisma generado usa `Lote` (mayúscula).

**Hallazgo Forense:**
- En schema.prisma línea 21: `Lote Lote[]` (nombre mayúscula)
- En código línea 40: `lotes: { ... }` (acceso con minúscula)

**Causa:** El comando `prisma db pull` sobrescribió el schema y cambió las convenciones de nomenclatura.

**Impacto:** ⚠️ Error de tipo: `'lotes' does not exist in type 'IngredienteSelect'`

---

### 🟡 BUG MEDIO #4: Validación de Stock Negativo Incompleta en `consumirStockFIFO`

**Síntoma:** La función no valida si hay suficiente stock antes de intentar consumir.

**Hallazgo Forense:**
```typescript
// Líneas 124-175 - consumirStockFIFO
// NO HAY validación de: if (cantidad > ingrediente.stockActual)
// Si pendiente > 0 al final del loop, significa stock insuficiente pero NO SE LANZA ERROR
```

**Comportamiento actual:**
- Si se intenta consumir más de lo disponible, `pendiente > 0` al final
- La función continúa silenciosamente (fail-open)
- Se decrementa `stockRestante = cantidad - pendiente` lo cual puede ser incorrecto

**Impacto:** ⚠️ Puede resultar en:
1. Stocks negativos silenciosos
2. Consumos parciales no reportados
3. Descuadres de inventario

---

### 🟢 SEGURIDAD - Sprint 3.1: VALIDADO CON OBSERVACIONES

**Archivos revisados:**
- [authService.ts](src/main/services/authService.ts) ✅
- [authIPC.ts](src/main/ipc/authIPC.ts) ⚠️
- [AuthProvider.tsx](src/renderer/context/AuthProvider.tsx) ✅

**Hallazgos:**

1. **Hash de contraseñas:** ✅ Usa bcryptjs con salt de 10 rounds - CORRECTO
2. **Validación de credenciales:** ✅ No expone información sobre usuarios inexistentes - CORRECTO
3. **Gestión de sesiones:** ⚠️ Almacenamiento en memoria (Map) - ACEPTABLE para MVP
4. **Protección de rutas:** ✅ `isAdmin` se valida en el frontend - CORRECTO

**Observación menor (no bloqueante):**
- Las sesiones en `activeSessions` (Map) no tienen TTL/expiración
- En producción debería agregarse limpieza automática
- Para MVP actual: ACEPTABLE

---

### 🟢 UI - InventoryView.tsx: VALIDADO

**Hallazgos:**
1. **Renderizado condicional:** ✅ Maneja correctamente estados de carga/error
2. **Protección de roles:** ✅ `isAdmin` controla botones de Importar/Ajustar
3. **Expansión de filas:** ✅ Lógica correcta con `expandedRow` state
4. **Event propagation:** ✅ Usa `e.stopPropagation()` para evitar clicks accidentales

---

## B. JUSTIFICACIÓN DE LA SOLUCIÓN

### Corrección 1: Eliminar código huérfano (líneas 256-268)
- **Acción:** Borrar las líneas residuales de la refactorización anterior
- **Riesgo:** Ninguno - es código muerto que causa errores de compilación

### Corrección 2: Implementar `createSyncLog` o reemplazar con código inline
- **Acción:** Crear función helper o usar `prisma.syncLog.create()` directamente
- **Riesgo:** Bajo - solo afecta logging de auditoría

### Corrección 3: Alinear nombres de relación Prisma
- **Acción:** Cambiar `Lote` a `lotes` en schema.prisma y regenerar
- **Riesgo:** Medio - requiere regenerar cliente Prisma

### Corrección 4: Agregar validación fail-safe en `consumirStockFIFO`
- **Acción:** Lanzar error si `pendiente > 0` después del loop FIFO
- **Riesgo:** Bajo - previene consumos imposibles

---

## C. INSTRUCCIONES DE HANDOFF PARA SOFIA (Builder)

### PASO 1: Aplicar parches al código
```bash
# Los parches serán aplicados por DEBY directamente
```

### PASO 2: Verificar compilación
```bash
cd /workspaces/colormanager
pnpm build
```

### PASO 3: Prueba de humo
1. Ejecutar `pnpm dev`
2. Hacer login con admin/admin123
3. Ir a Inventario
4. Expandir una fila para ver lotes
5. Intentar ajustar stock (sumar y restar)

### PASO 4: Validar que no hay regresiones
- [ ] Stock se descuenta correctamente
- [ ] Lotes se consumen en orden FIFO
- [ ] No aparecen stocks negativos
- [ ] Los ajustes quedan en SyncLog

---

## RESUMEN EJECUTIVO

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 Crítico | 2 | REQUIERE FIX INMEDIATO |
| 🟡 Medio | 2 | REQUIERE FIX |
| 🟢 Info | 1 | OBSERVACIÓN |

**VEREDICTO:** El código NO está listo para producción debido a errores de compilación críticos. Se requiere intervención inmediata.

---

*Dictamen emitido por DEBY - Lead Debugger & Traceability Architect*
*FIX REFERENCE: FIX-20260129-01*
