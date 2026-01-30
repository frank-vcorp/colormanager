/**
 * Configuración de Vite
 * ID Intervención: FIX-20260128-02
 * Respaldo: context/interconsultas/DICTAMEN_FIX-20260128-02.md
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
    // FIX: Usar rutas relativas para que funcione en file:// protocol
    base: './',
  },
})
