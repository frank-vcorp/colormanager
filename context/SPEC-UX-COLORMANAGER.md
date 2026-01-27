# SPEC-UX-UI: Diseño Visual ColorManager

**Versión:** 1.0
**Estilo:** "Clean Industrial" (Claro, Minimalista, Alineado)

## 1. Filosofía de Diseño
*   **Claridad sobre Decoración:** Interfaz funcional, fondo blanco/gris neutro, textos negros de alto contraste.
*   **Grid System:** Todo debe estar perfectamente alineado a una retícula. Sin elementos flotantes o logotipos decorativos "en medio".
*   **Touch First:** Botones de acción mínimos de **64px de alto**. Espaciado generoso para evitar toques accidentales.
*   **Zero Distraction:** En pantalla de mezcla, eliminar todo excepto la barra de progreso y el peso actual.

## 2. Paleta de Colores
*   **Fondo:** `#F8F9FA` (Gris muy claro, casi blanco) o `#FFFFFF`.
*   **Superficies:** `#FFFFFF` con bordes sutiles `#E5E7EB`.
*   **Texto Principal:** `#111827` (Casi negro).
*   **Texto Secundario:** `#6B7280` (Gris medio).
*   **Semáforo (Feedback):**
    *   🔴 Stop/Peligro: `#EF4444` (Visible a distancia).
    *   🟡 Precaución/Cerca: `#F59E0B`.
    *   🟢 Éxito/Listo: `#10B981`.
*   **Primario (Acción):** `#2563EB` (Azul corporativo estandar, sobrio).

## 3. Tipografía
*   **Fuente Principal:** `Inter` o system sans-serif (Segoe UI).
*   **Números (Pesos):** `JetBrains Mono` o `Roboto Mono` (Monospaced) para evitar que los números "bailen" al cambiar decimales.

## 4. Componentes Clave

### A. Pantalla de Espera (Standby)
*   **Diseño:** Limpio.
*   **Contenido:**
    *   Barra de estado superior (Pequeña): Estado Báscula | Estado Impresora.
    *   Centro: Texto simple "Esperando Receta..." (Tipografía H2).
    *   Sin logos grandes ni bordes innecesarios.

### B. Modo Mezcla (Mixing Mode)
*   **Layout:** Split View 50/50 o 40/60.
*   **Panel Izquierdo (Lista):**
    *   Tabla estricta de ingredientes.
    *   Filas altas (touch).
    *   Ingrediente activo resaltado con fondo azul claro.
*   **Panel Derecho (Ejecución):**
    *   **Contador de Peso:** Gigante (ej. viaja de 0.0g a 150.0g).
    *   **Barra de Progreso:** Lineal, limpia, sin bordes redondeados excesivos.
    *   **Botones:** "Tara", "Omitir", "Reportar" en la parte inferior, anclados.

### C. Sistema de Alertas
*   **Modales:** Centrados, fondo blanco, sombra dura (no difuminada).
*   **Botones:** "Cancelar" (Gris), "Confirmar" (Azul/Rojo). Texto claro.

## 5. Reglas de Comportamiento
*   **Animaciones:** Rápidas (<200ms) o inexistentes. Prioridad a la respuesta inmediata.
*   **Feedback Sonoro:** Obligatorio en eventos: Scan OK, Peso Alcanzado, Error.
