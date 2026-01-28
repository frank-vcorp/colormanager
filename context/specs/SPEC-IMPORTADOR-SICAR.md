# SPEC: Importador Masivo SICAR
**ID:** ARCH-20260127-02
**Estado:** Aprobado
**Micro-Sprint:** 9

## 1. Contexto
El taller utiliza SICAR v4 como sistema administrativo principal. El inventario de pinturas se gestiona allí. ColorManager debe sincronizarse con SICAR para descontar lo que se usa.
La integración inicial (Sprint 2) será vía **Importación de CSV**. El usuario exporta de SICAR y carga en ColorManager.

## 2. Formato del Archivo CSV
Se espera un archivo CSV exportado desde SICAR con las siguientes características:
*   **Encoding:** UTF-8 o ISO-8859-1
*   **Separador:** Coma (`,`)
*   **Cabeceras Requeridas:**
    *   `Clave` -> Mapea a `Ingrediente.codigo` (SKU)
    *   `Descripcion` -> Mapea a `Ingrediente.nombre`
    *   `Existencia` -> Mapea a `Ingrediente.stockActual`
    *   `Costo` (Opcional) -> Mapea a `Ingrediente.costo`

### Ejemplo:
```csv
Clave,Descripcion,Existencia,Departamento,CostoPromedio
KT-1400,Tinte Rojo Base,2500,Pinturas,150.50
KT-1100,Tinte Amarillo,1200,Pinturas,200.00
```

## 3. Lógica de Importación (Upsert)
Al procesar el archivo:
1.  Se lee línea por línea.
2.  Por cada registro:
    *   **Buscar** `Ingrediente` por `codigo` (Clave).
    *   **Si existe:** Actualizar `stockActual`, `nombre` y `costo`.
    *   **Si no existe:** Crear nuevo registro con `stockMinimo` default (100g).
3.  **Conversión de Unidades:**
    *   Se asume que la `Existencia` en SICAR viene en la misma unidad que ColorManager (Gramos/Mililitros). No se aplicará conversión en esta etapa.

## 4. Requisitos Técnicos
*   **Backend (`src/main/services/importService.ts`):**
    *   Usar `csv-parse` o parser nativo robusto.
    *   Validar cabeceras.
    *   Ejecutar updates en una transacción de Prisma (`prisma.$transaction`).
*   **IPC:**
    *   `INVENTARIO_IMPORTAR_CSV`: Recibe path del archivo (o contenido raw si es pequeño, mejor path).
    *   Retorna: `{ processed: number, updated: number, errors: string[] }`
*   **UI:**
    *   En `InventoryView`, agregar botón "Importar de SICAR".
    *   Diálogo `dialog.showOpenDialog` (desde main process invocado por renderer).
    *   Mostrar spinner mientras procesa (puede tardar si son miles).
    *   Mostrar resumen al finalizar: "Se actualizaron 45 tintes".

## 5. Casos Borde
*   **CSV Malformado:** Abortar y mostrar error.
*   **Clave Duplicada en CSV:** Tomar la última ocurrencia.
*   **Stocks Negativos:** Importar tal cual (SICAR permite negativos), pero UI debe alertar.
