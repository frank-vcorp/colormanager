# Configuración de Entorno Headless (Electron en Contenedor)

**ID:** INFRA-20260128-01
**Fecha:** 2026-01-28
**Autor:** GEMINI (QA/Infra)
**Estado:** Verificado

## Contexto
Ejecutar Electron dentro de un DevContainer o entorno CI/CD requiere simular un servidor gráfico (X Server) ya que no existe un display físico.

## Solución Implementada
Se ha configurado `xvfb` (X Virtual Framebuffer) para permitir la ejecución de Electron en modo headless pero con capacidad de renderizado virtual.

### 1. Dependencias del Sistema
Para que Electron funcione en Ubuntu 24.04 (Noble Numbat) dentro del contenedor, se requieren las siguientes librerías:

```bash
sudo apt-get update && sudo apt-get install -y \
  xvfb \
  libgtk-3-0 \
  libnss3 \
  libasound2t64 \
  libgbm1 \
  libxss1 \
  libxtst6
```

> **Nota:** En Ubuntu 24.04, `libasound2` ha sido reemplazado por `libasound2t64`.

### 2. Script npm
Se ha agregado el script `dev:container` en `package.json`:

```json
"dev:container": "concurrently -k \"pnpm run watch:main\" \"vite\" \"wait-on http://localhost:5173 && wait-on dist-electron/main/main.cjs && xvfb-run --auto-servernum --server-args='-screen 0 1280x1024x24' electron . --no-sandbox --disable-gpu --disable-dev-shm-usage\""
```

**Explicación de flags:**
- `xvfb-run`: Ejecuta el comando en un entorno X virtual.
  - `--auto-servernum`: Busca un número de display libre automáticamente.
  - `--server-args`: Define la resolución virtual (necesaria para que la UI se renderice correctamente en memoria).
- `electron .`: Inicia la app.
  - `--no-sandbox`: Requerido en contenedores Docker sin privilegios.
  - `--disable-gpu`: Desactiva aceleración por hardware (innecesaria y problemática en headless).
  - `--disable-dev-shm-usage`: Evita errores de memoria compartida en Docker (/dev/shm).

### 3. Ejecución
Para iniciar el entorno de desarrollo dentro del contenedor:

```bash
pnpm run dev:container
```

Esto iniciará:
1. Compilación de Main Process (watch).
2. Servidor Vite (Renderer).
3. Instancia de Electron conectada a Xvfb.

### 4. Verificación
Si la aplicación arranca correctamente, verás los logs de Electron y Vite en la terminal sin errores de "Missing X server" o "Gtk: cannot open display".
