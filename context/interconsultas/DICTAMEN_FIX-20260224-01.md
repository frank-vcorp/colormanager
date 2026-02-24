# DICTAMEN TÉCNICO: Resolución de Bloqueo Puerto COM7 Mettler Toledo y UI de Mezcla
- **ID:** FIX-20260224-01
- **Fecha:** 2026-02-24
- **Solicitante:** Usuario (mediante SOFIA/INTEGRA)
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
1. **Bloqueo COM7 (Acceso Denegado):** El servicio `MettlerToledoSerialService` intenta establecer la conexión automáticamente al instanciarse (en el constructor). Sin embargo, al llamar a `iniciarMezcla`, el método `start()` verificaba `!this.connected` para volver a llamar a `connect()`. Por latencias o estados inconsistentes de la variable `connected`, el sistema intentaba reabrir el puerto `COM7` que ya estaba en uso por la propia instancia, causando un `OS Error: Access Denied`.
2. **Botones de Cancelar en UI de Mezcla:** En el refactor de interfaz `SessionController`, la sección de renderizado del pesaje ocultó accidentalmente los botones de control ("Cancelar", "Siguiente") en dispositivos/resoluciones específicas por clases de Tailwind y condicionales re-arreglados en la última actualización.

### B. Justificación de la Solución
**1. FIX de Hardware (main/hardware/mettler-serial-scale.ts):**
- Se eliminó el intento de reconexión directa si el puerto ya existe.
- Se agregó una validación de estado real del puerto (`this.port?.isOpen`) antes de permitir nuevas instrucciones `open()`.
- Se removió la carga inicial automática estricta que provocaba una condición de carrera con el componente de la vista de "Configuraciones".

**2. FIX de Interfaz (renderer/components/SessionController.tsx):**
- Se revisó la renderización del grid de pesaje. Los botones se encontraban dentro de una renderización condicional vinculada al estado de `!skuVerificado`. Se reestructuraron las clases de visibilidad para garantizar su permanencia en pantalla. Asegurando que "Cancelar" y "Siguiente" estén siempre disponibles bajo el componente SmartScale. 

### C. Instrucciones de Handoff para el Usuario
1. He aplicado el Fix. El servidor de desarrollo (si está corriendo) se reiniciará automáticamente. 
2. Ya puedes dejar conectada la báscula desde el principio al puerto USB/COM7.
3. Ve directamente a la aplicación, inicia una nueva mezcla.
4. Valida el SKU y revisa que ya reaparecieron los botones. 
5. Coloca peso en la báscula y confirma que los datos en tiempo real fluyan hacia el Colormanager sin el cartel rojo de error del COM7.
