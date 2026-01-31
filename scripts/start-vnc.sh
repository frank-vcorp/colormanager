#!/bin/bash
# scripts/start-vnc.sh
set -e

# DISPLAY a usar
DNUM=100
export DISPLAY=:$DNUM

echo "[VNC] Iniciando entorno visual en DISPLAY $DISPLAY..."

# 1. Limpieza
rm -f /tmp/.X$DNUM-lock

# 2. Iniciar Xvfb
Xvfb $DISPLAY -screen 0 1280x1024x24 &
sleep 2

# 3. Iniciar x11vnc
x11vnc -display $DISPLAY -nopw -forever -shared -bg -rfbport 5900

# 4. Iniciar noVNC
/usr/share/novnc/utils/novnc_proxy --vnc localhost:5900 --listen 6080 &

echo "----------------------------------------------------------------"
echo "  SISTEMA VISUAL ACTIVO"
echo "  Si estás en Antigravity, usa el puerto 6080 expuesto."
echo "----------------------------------------------------------------"

# 5. Lanzar la aplicación
# Usamos pnpm run dev:container pero le pasamos el DISPLAY
pnpm run dev:container
