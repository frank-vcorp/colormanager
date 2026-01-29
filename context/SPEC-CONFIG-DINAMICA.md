# SPEC: Sistema de Configuración Dinámica (Modo Demo vs Prod)
**ID:** ARCH-20260129-01
**Fecha:** 2026-01-29
**Prioridad:** Alta (Requerido para pase a producción)

## 🎯 Objetivo
Permitir que la aplicación cambie su comportamiento entre "Modo Demo" (simulación) y "Modo Producción" (hardware real) mediante una interfaz de configuración, sin necesidad de recompilar el código. Esto también gestionará rutas de archivos y puertos COM.

## 🛠️ Arquitectura Técnica

### 1. Persistencia de Configuración (`ConfigService`)
Usar `electron-store` para guardar un archivo JSON persistente en `userData`.

**Schema de Configuración (`AppConfig`):**
```typescript
interface AppConfig {
  mode: 'DEMO' | 'PRODUCTION';
  hardware: {
    scalePort: string; // ej: "COM3"
    baudRate: number;  // ej: 9600
  };
  paths: {
    sayerSpoolDir: string; // Ruta absoluta a carpeta de recetas
  };
}
```

### 2. Capa de Abstracción de Hardware (HAL)
Refactorizar la lógica de inicialización en `main.ts`:
- Crear interfaz `IScaleService`.
- `MockScaleService` debe implementar `IScaleService`.
- (Futuro) `SerialScaleService` implementará `IScaleService`.

### 3. IPC Channels
- `config:get`: Renderer solicita config actual.
- `config:set`: Renderer guarda nueva config. Main process debe detectar el cambio y reiniciar los servicios (Mock vs Serial) si es necesario.

### 4. Interfaz de Usuario (`SettingsView`)
Nueva vista accesible desde la navegación principal:
- **Switch Maestro:** DEMO / PRODUCCIÓN.
- **Campos Condicionales:**
  - Si es PROD: Mostrar inputs para "Puerto Báscula" (Dropdown o Texto) y "Ruta Carpeta Sayer" (Input con botón de examinar carpeta).
  - Si es DEMO: Mostrar mensaje informativo "Usando hardware simulado".

## ✅ Plan de Implementación (SOFIA)

1. **Instalación:**
   - Agregar `electron-store`.

2. **Backend (Main):**
   - Crear `src/main/services/configService.ts`.
   - Modificar `src/main/main.ts` para inicializar servicios basados en la config almacenada.
   - Implementar IPC handlers para leer/escribir config.

3. **Frontend (Renderer):**
   - Crear `src/shared/types.ts` (si no existe definición de Config).
   - Crear `src/renderer/components/SettingsView.tsx`.
   - Integrar en `App.tsx` o routing.

4. **Hot-Reload (Opcional/Deseable):**
   - Si cambiamos de DEMO a PROD, `main.ts` debería destruir `MockScaleService` e intentar iniciar la conexión real (o viceversa) sin reiniciar la app completa, enviar señal de recarga al renderer.
