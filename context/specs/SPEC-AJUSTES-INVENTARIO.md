# SPEC-AJUSTES-INVENTARIO: Gestión de Mermas y Ajustes Manuales

> **ID:** ARCH-20260128-02  
> **Fecha:** 2026-01-28  
> **Autor:** INTEGRA (Arquitecto)

## 1. Alcance
Implementar la capacidad de realizar ajustes manuales al inventario (positivos o negativos) desde la interfaz de usuario, registrando la causa para auditoría.

## 2. Historias de Usuario
- **Como** jefe de taller, **quiero** corregir el stock si veo que una lata se derramó, **para** que el sistema refleje la realidad.
- **Como** auditor, **quiero** saber quién y por qué ajustó el stock, **para** detectar robos o malas prácticas.

## 3. Arquitectura

### 3.1 Base de Datos
No requiere cambios de schema estructurales, usaremos los modelos existentes:
- **`Ingrediente`**: Se actualizará el campo `stockActual`.
- **`SyncLog`**: Se insertará un registro con:
  - `tabla`: "Inventario"
  - `accion`: "AJUSTE_MANUAL"
  - `cambios`: JSON con `{ sku, delta, motivo, stockAnterior, stockNuevo, usuario: "Operador" }`

### 3.2 IPC
Nuevo canal: `inventory:adjust-stock` (Invoke)
- **Input**: `{ sku: string, cantidad: number, motivo: string, operacion: 'sumar' | 'restar' }`
- **Output**: `{ success: true, nuevoStock: number }`

### 3.3 Interfaz de Usuario (InventoryView)
- Agregar columna "Acciones" en la tabla.
- Botón "📝 Ajustar" (Icono de lápiz).
- **Modal de Ajuste**:
  - Título: "Ajustar Stock: [Nombre Producto]"
  - Selector: "Ingreso" (+) o "Salida/Merma" (-)
  - Input: Cantidad (Gramos)
  - Select Motivo: ["Corrección Conteo", "Merma/Derrame", "Entrada Extra", "Otro"]
  - Botón: "Guardar Ajuste".

## 4. Validaciones
- No permitir stock negativo (validar que `stockActual - cantidad >= 0` si es resta).
- Motivo obligatorio.
- Cantidad > 0.

## 5. Plan de Pruebas
1. Seleccionar ingrediente con 1000g.
2. Ajustar -100g por "Merma".
3. Verificar stock visual: 900g.
4. Verificar BD `SyncLog`: registro de acción `AJUSTE_MANUAL`.
