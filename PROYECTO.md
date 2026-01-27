# PROYECTO: ColorManager

> **Misión:** Sistema de control de producción ("Auditor de Mezclas") para taller de igualación automotriz. Intercepta recetas de Sayer, controla báscula Mettler Toledo y valida inventario serializado.

## Flujo de Estados
- [ ] Pendiente (En Backlog)
- [~] Planificado (Tiene SPEC y está asignado)
- [/] En Progreso (En desarrollo activo)
- [✓] Completado (Codeado y Testeado)
- [X] Aprobado (Validado por Humano en Demo)

---

## 📋 MICRO-SPRINT: Inicialización y Cimientos
**Fecha:** 2026-01-27
**Duración estimada:** 2 horas
**Objetivo:** Establecer el esqueleto del proyecto Electron+React y configurar la infraestructura base de desarrollo.

### 🎯 Entregable Demostrable
> "Una aplicación de escritorio Electron instalable que muestra una pantalla de 'Hola ColorManager' y es capaz de leer (simuladamente) datos de una báscula vía Serial Port."

### ✅ Tareas Técnicas
- [x] **(1) Inicialización Stack:** Crear repo con Electron, Vite, React, TS, Tailwind. `(INTEGRA)`
- [x] **(2) Configuración IPC:** Establecer puente seguro entre Main (Node) y Renderer (React). `(SOFIA)`
- [x] **(3) Arquitectura Base:** Estructura de carpetas según `00_ARQUITECTURA.md`. `(INTEGRA)`
- [x] **(4) Pre-Config Hardware:** Instalar dependencias `serialport` y configurar un "Mock Scale Service" para desarrollo sin hardware real. `(SOFIA)`

### 🧪 Cómo Demostrar
1. Ejecutar `pnpm dev`.
2. Ver la ventana de aplicación nativa (no navegador).
3. Ver un log en consola o UI que diga "Báscula conectada (Simulación)".

---

## 📋 MICRO-SPRINT 2: Lectura Sayer
**Fecha estimada:** 2026-01-28
**Duración estimada:** 2 horas
**Objetivo:** Habilitar la lectura inicial de recetas de Sayer mediante un watcher de archivos y exponer el flujo básico en la UI.

### 🎯 Entregable Demostrable
> "La aplicación detecta automáticamente un archivo de receta generado por Sayer en una carpeta observada y muestra en pantalla el contenido bruto de la receta (o un log legible) indicando que fue detectada correctamente."

### ✅ Tareas Técnicas
- [x] **(1) Watcher Sayer:** Configurar un watcher de archivos para detectar creación/actualización de recetas en la carpeta de salida de Sayer.
- [x] **(2) Ingesta de Receta Cruda:** Persistir el texto plano de la receta en una estructura de datos o almacenamiento local para procesamiento posterior.
- [x] **(3) Exposición en UI:** Mostrar en la UI (o log visible) la última receta detectada con metadatos básicos (timestamp, nombre de archivo).

### 🧪 Cómo Demostrar
1. Ejecutar `pnpm dev`.
2. Usar el botón flotante "🧪 Simular Receta" en la esquina inferior derecha.
3. Verificar que aparece la tabla de ingredientes con datos de prueba.

---

## 📋 MICRO-SPRINT 3: Báscula y UX de Mezcla
**Fecha estimada:** Próxima Sesión
**Duración estimada:** 2 horas
**Objetivo:** Conectar el flujo, de pesaje en tiempo real y guiar al usuario visualmente durante la mezcla.

### 🎯 Entregable Demostrable
> "El usuario selecciona un ingrediente de la receta y ve una barra de progreso que se llena en tiempo real al subir peso en la báscula (simulada), cambiando de color cuando llega a la meta."

### ✅ Tareas Técnicas
- [ ] **(1) Pipeline de Pesaje:** Conectar `MockScaleService` -> IPC `peso:actualizado` -> Renderer.
- [ ] **(2) Hook useBascula:** Crear hook de React para suscripción limpia a eventos de pesaje.
- [ ] **(3) Componente SmartScale:** Indicador visual de peso grande + Barra de progreso con zonas de tolerancia.
- [ ] **(4) Lógica de Estado:** Gestionar estado de sesión (Ingrediente Actual, Peso Inicial, Peso Target).

### 🧪 Cómo Demostrar
1. Cargar receta simulada.
2. Click en "Iniciar Mezcla" (Primer ingrediente).
3. Usar controles de simulación de báscula (slider o botón "+1g") para subir peso.
4. Ver cómo la barra de progreso avanza y se pone verde al llegar al target.

---

## Roadmap de Sprints

### 🗓️ [/] SPRINT 1: Control de Mezcla (Core)
> **Objetivo:** Que el igualador pueda pesar y mezclar una fórmula básica proveniente de Sayer.
- [ ] **Lectura Sayer:** Watcher de archivos para detectar impresión de recetas.
- [ ] **Parser Recetas:** Convertir texto plano de Sayer a Objeto JSON (Receta).
- [ ] **Conexión Báscula Real:** Lectura de stream de peso de Mettler Toledo.
- [ ] **UI Mezcla:** Barra de progreso visual (Semáforo estático).
- [ ] **Validación SKU:** Input de Scanner que compare contra ingrediente activo.

### 🗓️ SPRINT 2: Inventario Cloud (Híbrido)
> **Objetivo:** Gestión de inventario local, importación de SICAR y réplica a Nube (Railway/Next.js).
- [ ] **DB Schema:** Definición de Modelos Prisma (Producto, Receta, Ajuste, Lote).
- [ ] **Importador SICAR:** Carga masiva de CSV.
- [ ] **Sync Engine:** Servicio background para replicar datos a Railway.
- [ ] **Admin Web:** Dashboard básico en Next.js conectado a Railway.
- [ ] **Gestión FIFO:** Lógica para bloquear lotes nuevos si hay viejos.
- [ ] **Etiquetado:** Generación de ZPL para Zebra (IDs Únicos).

### 🗓️ SPRINT 3: Seguridad y Hardening
> **Objetivo:** Bloqueos de seguridad, roles de usuario y manejo de excepciones (mermas).
- [ ] **Login:** Roles Admin vs Igualador.
- [ ] **Modo Kiosco:** Bloqueo de cierre de ventana para igualadores.
- [ ] **Reporte Mermas:** Pantalla de justificación de pérdidas.

---

## Deuda Técnica / Notas
- *N/A - Proyecto Nuevo*

## Decisiones Arquitectónicas
- [ARCH-20260127-01] Stack: Electron + React + SQLite.

---

## Historial
- 2026-01-27 · [X] Aprobado Micro-Sprint 1 "Inicialización y Cimientos": framework base Electron + React + SQLite aceptado tras demo visual del usuario. (ID: DOC-20260127-01)
