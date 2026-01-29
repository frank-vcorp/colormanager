# SPEC-ETIQUETADO-PDF: Generación de Etiquetas de Inventario

> **ID:** ARCH-20260128-03  
> **Fecha:** 2026-01-28  
> **Autor:** INTEGRA (Arquitecto)

## 1. Alcance
Implementar la generación de etiquetas imprimibles en formato PDF universal para los productos del inventario. Esto permite usar cualquier impresora convencional (inyección/láser) o térmica configurada en el SO, sin depender de drivers ZPL específicos.

## 2. Historias de Usuario
- **Como** almacenista, **quiero** imprimir una etiqueta con código de barras para un bote de pintura nuevo, **para** poder escanearlo rápidamente al momento de mezclar.
- **Como** administrador, **quiero** imprimir etiquetas legibles humanamente y por máquina, **para** organizar el estante.

## 3. Arquitectura

### 3.1 Librerías
- **Frontend (Renderer):** 
  - `react-barcode`: Para generar el código de barras (Code 128) visualmente.
  - `window.print()`: Utilizar el diálogo nativo de impresión del sistema operativo (Electron lo soporta).

### 3.2 Interfaz de Usuario
1. **Acción en Tabla:** 
   - Agregar botón "🖨️" en la columna de Acciones de `InventoryView`.
2. **Modal de Previusalización (PrintPreview):**
   - Al hacer clic, se abre un modal con el diseño de la etiqueta.
   - **Formato:** Tamaño configurable (ej. 5cm x 3cm o media carta).
   - **Contenido:**
     - Nombre del Producto (Grande, legible).
     - SKU (Texto).
     - Código de Barras (Escaneable).
     - Fecha de impresión.
   - Botón "Imprimir": Invoca `window.print()`.

### 3.3 Flujo Técnico
1. Usuario click en "Imprimir" en fila de producto.
2. React renderiza componente `<LabelTemplate product={p} />` dentro de un iframe oculto o ventana modal con CSS específico `@media print`.
3. Se invoca impresión.
4. Electron gestiona el driver de impresora del SO.

## 4. Validaciones
- El código de barras debe ser legible por el escáner (alto contraste, tamaño suficiente).
- El SKU debe coincidir exactamente con el valor en BD.

## 5. Plan de Pruebas
1. Validar que el código de barras generado se pueda leer con el escáner físico.
2. Imprimir en PDF ("Microsoft Print to PDF" o similar).
3. Verificar layout no se rompa.
