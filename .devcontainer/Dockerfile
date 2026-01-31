FROM node:20-bookworm

# Evitar prompts interactivos durante la instalación
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias para Electron y Xvfb
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    libgtk-3-0 \
    libnss3 \
    libasound2 \
    libgbm1 \
    libxss1 \
    libxtst6 \
    libxshmfence1 \
    libglu1-mesa \
    build-essential \
    python3 \
    net-tools \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Instalar pnpm
RUN npm install -g pnpm

# Configurar alias para pnpm si es necesario
# RUN echo 'alias p=pnpm' >> /home/vscode/.bashrc

# Exponer puertos para Vite y depuración
EXPOSE 5173
EXPOSE 5858
EXPOSE 9222
EXPOSE 6080
