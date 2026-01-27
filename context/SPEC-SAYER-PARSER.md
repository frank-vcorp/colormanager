# SPEC-SAYER-PARSER: Especificación de Lectura de Recetas

**ID:** SPEC-20260127-PARSER
**Fuente:** Captura de pantalla "FORMULACIÓN" (Sayer System)
**Objetivo:** Extraer lista de ingredientes y metadatos desde archivos de texto plano generados por impresión virtual.

## 1. Estructura del Archivo (Patrón Visual)

El archivo de texto se espera con la siguiente estructura (basada en el OCR de la imagen proporcionada):

```text
FORMULACIÓN

Número      : [NUMERO_FORMULA]
HISTORIA    : [TIPO_HISTORIA]

Primera capa

   [IDX] : [CODIGO_SKU]          [PESO] (g)
   ...
   01 : KT-1400                323.0 (g)
   02 : KT-1100                249.0 (g)
   ...

            Total              [PESO_TOTAL] (g)
            Peso actual        [PESO_ACTUAL] (g)

Car Maker:     [MARCA]
Color Code:    [CODIGO_COLOR]
Sayer Code:    [CODIGO_SAYER]
```

## 2. Reglas de Extracción (Regex)

### A. Encabezado
*   **Número:** Capturar línea que contiene `Número` o `Numero`.
    *   Regex: `Número\s*:\s*(\w+)`
*   **Capa:** Detectar inicio de bloque ingredientes con `Primera capa` o `Segunda capa`.

### B. Ingredientes (Líneas de Detalle)
*   Patrón de línea: `Índice : SKU Peso (g)`
*   Regex: `^\s*(\d+)\s*:\s*([A-Z0-9-]+)\s+(\d+\.?\d*)\s*\(g\)`
*   Grupos:
    1.  Indice (ej: "01")
    2.  SKU (ej: "KT-1400")
    3.  Peso (ej: "323.0") -> Convertir a Float.

### C. Metadatos (Footer)
*   Buscar etiquetas específicas al final del archivo.
*   `Car Maker:\s*(.*)`
*   `Color Code:\s*(.*)`
*   `Sayer Code:\s*(.*)`

## 3. Lógica de Procesamiento
1.  **Watcher:** Detectar nuevo archivo `.txt` o `.prn` en carpeta `C:\Sayer\Spool` (Simulada: `./sayer-spool`).
2.  **Debounce:** Esperar 500ms tras detección para asegurar escritura completa.
3.  **Parsing:** Leer línea por línea.
    *   Ignorar líneas vacías.
    *   Si detecta "Primera capa", activar flag `readingIngredients`.
    *   Si detecta "Total", desactivar flag `readingIngredients`.
4.  **Validación:**
    *   La suma de los pesos extraídos debe coincidir con el "Total" leído (tolerancia 0.1g).
5.  **Output:** Objeto JSON `RecetaSayer`.

## 4. Estructura JSON Resultante

```typescript
interface RecetaSayer {
  numero: string;      // "001"
  historia: string;    // "F"
  capas: {
    nombre: string;    // "Primera capa"
    ingredientes: {
      orden: number;   // 1
      sku: string;     // "KT-1400"
      pesoMeta: number;// 323.0
    }[]
  }[];
  meta: {
    carMaker?: string;
    colorCode?: string;
  }
}
```
