# Checkpoint: Implementación de Impresora Virtual y Gestión de Ventanas
**ID:** IMPL-20260130-01
**Fecha:** 2026-01-31
**Autor:** @SOFIA (Code) + @INTEGRA (Doc)

## 🚀 Resumen de Cambios
Se implementó un sistema robusto para interceptar las impresiones de Sayer directamente vía red (TCP), eliminando la dependencia de archivos en disco y mejorando la confiabilidad en Windows. Además, se integró un monitor visual y comportamiento inteligente de ventanas.

## 🛠️ Nuevas Características

### 1. Servidor de Impresión Virtual (TCP/IP)
- **Servicio:** `VirtualPrinterServer.ts`
- **Puerto:** `9100` (Configurable via `printerPort`)
- **Funcionamiento:** Actúa como una impresora RAW. Sayer envía los datos a `127.0.0.1:9100` y la aplicación los captura en memoria sin tocar el disco.
- **Ventaja:** Mayor velocidad y se evitan problemas de permisos de escritura o bloqueos de archivo en Windows.

### 2. Parser Unificado
- **Clase:** `SayerParser.ts`
- **Función:** Centraliza la lógica de decodificación de recetas (Regex para ingredientes, cantidades, metadatos).
- **Uso:** Utilizado tanto por el servicio de archivos (Legacy) como por la nueva impresora virtual.

### 3. Monitor de Impresión (UI)
- **Componente:** `PrinterMonitor.tsx`
- **Ubicación:** Barra superior (`HeaderBar`), junto a los controles de usuario.
- **Estados Visuales:**
  - 🟢 **Listo** (Idle)
  - 🔵 **Recibiendo** (Datos entrando por socket)
  - 🟡 **Procesando** (Parseando receta)
  - 🔴 **Error**
- **Funcionalidad:** Muestra una cola con los últimos 10 trabajos, indicando si fueron exitosos o fallidos y mostrando un preview de los datos raw.

### 4. Gestión Inteligente de Ventanas
- **Auto-Focus:** Al detectar una receta (vía archivo o red), la ventana se restaura, se enfoca y se fuerza al frente (`AlwaysOnTop` temporal).
- **Auto-Minimizar:** Al finalizar una mezcla exitosamente, la aplicación se minimiza automáticamente para devolver el control a Sayer.
- **Control Manual:** Botón de minimizar agregado en la barra superior.

## 🔧 Cambios de Infraestructura (Docker/Windows)
- Se añadieron configuraciones para VNC/noVNC en el contenedor (aunque se priorizó la instalación nativa en Windows).
- Se mapearon los puertos `9100` (Impresora) y `6080` (VNC) en `docker-compose.yml`.

## 📦 Instrucciones de Despliegue (Windows)
1.  **Actualizar:** `git pull origin master`
2.  **Construir:** `pnpm install && pnpm run build`
3.  **Configurar Windows:**
    - Agregar impresora "Generic / Text Only".
    - Crear puerto TCP/IP estándar apuntando a `127.0.0.1`.
    - Nombre de impresora: "ColorManager Printer".
4.  **Verificar:** El widget de la impresora en la app debe mostrarse en verde 🟢.

---
*Fin de sesión. Código pusheado a origin/master.*
