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
**Fecha:** 2026-01-27
**Duración:** 1.5 horas
**Objetivo:** Conectar el flujo de pesaje en tiempo real y guiar al usuario visualmente durante la mezcla.

### 🎯 Entregable Demostrable
> "El usuario selecciona un ingrediente de la receta y ve una barra de progreso que se llena en tiempo real al subir peso en la báscula (simulada), cambiando de color cuando llega a la meta."

### ✅ Tareas Técnicas
- [x] **(1) Pipeline de Pesaje:** Conectar `MockScaleService` -> IPC `peso:actualizado` -> Renderer. `(SOFIA)`
- [x] **(2) Hook useBascula:** Crear hook de React para suscripción limpia a eventos de pesaje. `(SOFIA)`
- [x] **(3) Componente SmartScale:** Indicador visual de peso grande + Barra de progreso con zonas de tolerancia. `(SOFIA)`
- [x] **(4) Componente SessionController:** Gestionar estado de sesión (Ingrediente Actual, Peso Inicial, Peso Target) y orquestar flujo. `(SOFIA)`
- [x] **(5) Integración App.tsx:** Transición fluida entre pantalla principal y sesión de mezcla. `(SOFIA)`

### 🧪 Cómo Demostrar
1. Cargar receta simulada (botón flotante "🧪 Simular Receta").
2. Hacer click en "▶ Iniciar Mezcla" en la ventana RecetaViewer.
3. Ver pantalla SessionController con primer ingrediente GIGANTE.
4. Ver cómo la barra de progreso avanza automáticamente (mock incrementa peso).
5. Cuando el peso entra en rango, barra se pone verde y botón "SIGUIENTE" se activa.
6. Click "SIGUIENTE" para ir al siguiente ingrediente.
7. Repetir hasta "✓ FINALIZAR MEZCLA".

### 📦 Entregables
- [x] Hook `useBascula.ts` - Gestiona suscripción a peso
- [x] Componente `SmartScale.tsx` - Display inteligente con feedback cromático
- [x] Componente `SessionController.tsx` - Orquestador de mezcla
- [x] Modificación `App.tsx` - Lógica de transición
- [x] Checkpoint `IMPL-20260127-04-AsistenciaMezclado.md` - Documentación completa
- [x] Commit en español con ID `IMPL-20260127-04`

---

## 📋 MICRO-SPRINT 4: Persistencia e Historial
**Fecha:** 2026-01-27
**Duración estimada:** 2 horas
**Objetivo:** Implementar la capa de persistencia (SQLite) para guardar las mezclas finalizadas y una pantalla para consultar el historial.

### 🎯 Entregable Demostrable
> "Al finalizar una mezcla, esta se guarda en base de datos. El usuario puede ir a la pestaña 'Historial', ver la lista de mezclas de hoy, y al hacer clic ver los detalles de lo que pesó."

### ✅ Tareas Técnicas
- [x] **(1) Setup DB:** Configurar `better-sqlite3` en `src/main/database` con tabla `mezclas` y `movimientos`. `(SOFIA)`
- [x] **(2) IPC Save:** Crear handler IPC `sesion:guardar` para recibir la sesión finalizada desde el Renderer. `(SOFIA)`
- [x] **(3) Vista Historial:** Crear `<HistoryView />` en React con tabla de registros. `(SOFIA)`
- [x] **(4) Navegación:** Agregar botón "Historial" en el Header para cambiar de vista. `(SOFIA)`

### 🧪 Cómo Demostrar
1. Realizar una mezcla completa con el simulador.
2. Al finalizar, verificar que no se pierde, sino que se guarda.
3. Ir a "Historial" y ver el registro nuevo.
4. Reiniciar la app (recargar página) y ver que los datos persisten.

---

## 📋 MICRO-SPRINT 5: Control de Inventario Básico
**Fecha:** 2026-01-27
**Duración estimada:** 2 horas
**Objetivo:** Implementar una gestión de stock local. Validar que exista material antes de mezclar y descontarlo al finalizar.

### 🎯 Entregable Demostrable
> "Una nueva pestaña 'Inventario' muestra los botes de pintura y sus niveles. Al terminar una mezcla, se ve cómo bajan los gramos disponibles de los tintes usados."

### ✅ Tareas Técnicas
- [x] **(1) Modelo de Datos:** Definir `Producto` (SKU, Nombre, Stock) y `Movimiento` en `types.ts`.
- [x] **(2) Seed Data:** Cargar datos iniciales de stock para los tintes de prueba (KT-1400, etc.) en `mock-ipc.ts`.
- [x] **(3) Vista Inventario:** Crear `<InventoryView />` con tabla de productos y barras de nivel.
- [x] **(4) Lógica de Descuento:** Al `guardarMezcla`, restar el peso *real* utilizado del stock del producto.

### 🧪 Cómo Demostrar
1. Ir a pestaña "Inventario" y ver que el `KT-1400` tiene por ejemplo 1000g.
2. Hacer una mezcla que use 323g de `KT-1400`.
3. Finalizar y guardar.
4. Volver a "Inventario" y verificar que ahora tiene 677g.

---

## 📋 MICRO-SPRINT 6: Refactor & Hardening
**Fecha:** 2026-01-27
**Duración estimada:** 2 horas
**Objetivo:** Limpieza técnica post-MVP. Eliminar deuda técnica detectada por QA (Tipos débiles, alertas nativas) y preparar arquitectura para producción.

### 🎯 Entregable Demostrable
> "El sistema ya no usa ventanas emergentes feas del navegador para confirmar acciones. El código es más seguro (menos `any`) y visualmente consistente."

### ✅ Tareas Técnicas
- [x] **(1) Hardening Tipos:** Mover definición de `window.colorManager` a `src/renderer/types/electron.d.ts` y eliminar `any`. `(SOFIA/DEBY)`
- [x] **(2) UI Notifications:** Crear componente `<ToastContainer />` y hook `useToast` para reemplazar `alert()` y mensajes de error estáticos. `(SOFIA)`
- [x] **(3) Refactor Inventario:** Reemplazar `confirm()` nativo en `InventoryView` por un Modal de confirmación UI. `(SOFIA)`

### 🧪 Cómo Demostrar
1. Intentar resetear inventario -> Ver un Modal bonito en lugar de la ventana del navegador.
2. Finalizar una mezcla -> Ver un Toast flotante "Guardado con éxito" en lugar de console logs.
3. Revisar código y ver que `window.colorManager` tiene autocompletado real.

---

## 📋 MICRO-SPRINT 7: Validación de Seguridad (SKU Scanner)
**Fecha:** 2026-01-27
**Duración estimada:** 1 hora
**Objetivo:** Evitar errores de mezcla obligando al usuario a escanear (o escribir) el código del bote antes de permitir el pesaje.

### 🎯 Entregable Demostrable
> "Al iniciar un ingrediente, la báscula está bloqueada. El usuario debe escribir el SKU correcto (ej. K-1400) y dar Enter. Solo si coincide, el sistema desbloquea la barra de progreso."

### ✅ Tareas Técnicas
- [x] **(1) Input de Validación:** Agregar campo de texto auto-enfocado en `SessionController`. `(SOFIA)`
- [x] **(2) Lógica de Bloqueo:** Estado `verificado` que impide ver la báscula hasta que el SKU coincida. `(SOFIA)`
- [x] **(3) Feedback Visual:** Animación de éxito/error al validar el código. `(SOFIA)`

### 🧪 Cómo Demostrar
1. Iniciar mezcla.
2. Intentar pesar -> La báscula debe decir "Esperando Validación".
3. Escribir un código incorrecto -> Error rojo.
4. Escribir el código correcto (scanner) -> Desbloqueo y check verde.

---

## 📋 MICRO-SPRINT 8 (Sprint 2.1): Base de Datos Real (Prisma + SQLite)
**Fecha:** 2026-01-27
**Duración estimada:** 2 horas
**Objetivo:** Reemplazar la persistencia en archivos/localStorage por una Base de Datos SQLite robusta gestionada con Prisma ORM.

### 🎯 Entregable Demostrable
> "El sistema ahora guarda los datos en un archivo `.db` real. Podemos cerrar la app, borrar caché del navegador, reiniciar el PC y los datos (Inventario e Historial) persisten intactos."

### ✅ Tareas Técnicas
- [x] **(1) Setup Prisma:** Instalar `prisma`, `better-sqlite3` y configurar `schema.prisma` (Modelos: Product, UsageLog). `(SOFIA)`
- [x] **(2) DB Service:** Crear `InventoryService` en el proceso Main para interactuar con la DB. `(SOFIA)`
- [x] **(3) Migración IPC:** Conectar los canales IPC existentes (`obtenerInventario`, `guardarMezcla`) al nuevo servicio real. `(SOFIA)`
- [x] **(4) Seed Script:** Script para poblar la DB inicial con los tintes de Sayer. `(SOFIA)`

### 🧪 Cómo Demostrar
1. Ejecutar migración de DB.
2. Hacer modificaciones en inventario (consumir stock).
3. Reiniciar completamente el proceso (Frontend y Backend).
4. Verificar que el stock modificado se mantiene.

---

## 📋 MICRO-SPRINT 9 (Sprint 2.2): Importador Masivo SICAR
**Fecha:** 2026-01-27
**Duración estimada:** 2 horas
**Objetivo:** Permitir cargar el inventario real desde un archivo CSV exportado de SICAR para inicializar o corregir stocks masivamente.

### 🎯 Entregable Demostrable
> "El usuario hace clic en 'Importar CSV', selecciona un archivo exportado de SICAR, y el sistema actualiza automáticamente los stocks de todos los tintes en la base de datos."

### ✅ Tareas Técnicas
- [x] **(1) CSV Parser Service:** Crear `ImportService` en Backend para parsear archivos CSV de SICAR.
- [x] **(2) Prisma Upsert:** Implementar lógica para Crear o Actualizar ingredientes masivamente.
- [x] **(3) IPC & Dialog:** Conectar botón de UI con `dialog.showOpenDialog` nativo de Electron.
- [x] **(4) Feedback UI:** Mostrar estado de carga y resumen final (ej. "50 productos actualizados").

### 🧪 Cómo Demostrar
1. Tener un archivo `inventario_sicar.csv` con datos de prueba.
2. Ir a Inventario -> Importar.
3. Seleccionar archivo.
4. Ver que la tabla se refresca con los nuevos valores del CSV.

---

## Roadmap de Sprints

### 🗓️ [✓] SPRINT 1: Control de Mezcla (Core)
> **Objetivo:** Que el igualador pueda pesar y mezclar una fórmula básica proveniente de Sayer.
- [x] **Lectura Sayer:** Watcher de archivos para detectar impresión de recetas.
- [x] **Parser Recetas:** Convertir texto plano de Sayer a Objeto JSON (Receta).
- [~] **Conexión Báscula Real:** Soporte listo via `MockScaleService`. driver `SerialPort` pendiente de deploy físico.
- [x] **UI Mezcla:** Barra de progreso visual (Semáforo estático).
- [x] **Validación SKU:** Input de Scanner que compare contra ingrediente activo.

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
 - [ARCH-20260127-03] Importador Masivo SICAR: flujo de carga CSV para inicializar/corregir inventario.

---

## Historial
- 2026-01-27 · [X] Aprobado Micro-Sprint 1 "Inicialización y Cimientos": framework base Electron + React + SQLite aceptado tras demo visual del usuario. (ID: DOC-20260127-01)
- 2026-01-27 · [X] Completado Micro-Sprint 2 "Lectura Sayer": Parser de recetas Sayer y visualización en RecetaViewer. (ID: IMPL-20260127-03)
- 2026-01-27 · [X] Completado Micro-Sprint 3 "Báscula y UX de Mezcla": Componentes SmartScale y SessionController con hook useBascula. (ID: IMPL-20260127-04)
 - 2026-01-27 · [X] Completado Micro-Sprint 8 "Base de Datos Real (Prisma + SQLite)": Integración de Prisma con SQLite, servicio de inventario y migración IPC finalizados. (ID: IMPL-20260127-08)
 - 2026-01-27 · [x] Completado Micro-Sprint 9 "Importador SICAR": Carga masiva de inventario desde CSV funcionando. (ID: IMPL-20260127-09)
 - 2026-01-27 · [x] Mejora Micro-Sprint 9: Soporte añadido para importar archivos Excel (.xls, .xlsx) usando librería `xlsx`. (ID: IMPL-20260127-10)
