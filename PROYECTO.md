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

## 📋 MICRO-SPRINT 10 (Sprint 2.3): Sync Nube (Railway)
**Fecha:** 2026-01-28
**Duración estimada:** 2-4 horas
**Objetivo:** Sincronizar el inventario local hacia un servicio cloud en Railway y mostrar estado de envío.

### 🎯 Entregable Demostrable
> "El inventario local se sincroniza a la nube y el usuario ve el estado de envío."

### ✅ Tareas Técnicas
- [x] **(1) Endpoint Cloud:** Definir endpoint REST en servicio Railway.
- [x] **(2) Sync Service:** Crear servicio en Main para enviar batch de inventario.
- [x] **(3) IPC:** Exponer `SYNC_INVENTARIO` para ejecutar sincronización.
- [x] **(4) UI Estado:** Botón y feedback de sincronización en Inventario.

### 🧪 Cómo Demostrar
1. Abrir Inventario.
2. Clic en "Sincronizar".
3. Ver estado "Enviado" con timestamp.

---

## 📋 MICRO-SPRINT 11 (Sprint 2.4): Ajustes de Inventario y Mermas
**Fecha estimada:** 2026-01-28
**Duración estimada:** 2 horas
**Estado:** [✓] Completado
**Objetivo:** Permitir ajustes manuales (positivos o negativos) al stock desde la UI, registrando motivo y dejando traza en SyncLog para auditoría.

### 🎯 Entregable Demostrable
> "Desde la vista de Inventario, el usuario puede aplicar un ajuste manual a un SKU (ingreso o merma), ver el nuevo stock reflejado en la tabla y confirmar que existe un registro de auditoría asociado al ajuste."

### ✅ Tareas Técnicas
- [x] **(1) Servicio de Ajustes:** Extender el servicio de inventario para aplicar deltas de stock sobre `Ingrediente` y registrar la acción en `SyncLog` con `AJUSTE_MANUAL`.
- [x] **(2) Canal IPC:** Implementar `inventory:adjust-stock` (Invoke) recibiendo `{ sku, cantidad, motivo, operacion }` y devolviendo `{ success, nuevoStock }`.
- [x] **(3) UI de Ajuste:** Agregar columna "Acciones" y botón "📝 Ajustar" en `InventoryView`, con modal "Ajustar Stock" que permita seleccionar tipo de ajuste (+/-), cantidad y motivo.
- [x] **(4) Validaciones y Feedback:** Evitar stock negativo, exigir motivo y cantidad > 0, mostrando mensajes claros de éxito/error.

### 🧪 Cómo Demostrar
1. Seleccionar un ingrediente con 1000g en Inventario.
2. Abrir el modal "Ajustar Stock" y registrar una merma de -100g con motivo "Merma/Derrame".
3. Verificar que el stock visual pasa a 900g.
4. Verificar en la base de datos que existe un registro en `SyncLog` con `AJUSTE_MANUAL` y los campos `{ sku, delta, motivo, stockAnterior, stockNuevo }`.

> ID de intervención: DOC-20260128-01 · Basado en SPEC `SPEC-AJUSTES-INVENTARIO` (ARCH-20260128-02).

## 📋 MICRO-SPRINT 12 (Sprint 2.5): Etiquetado PDF de Inventario
**Fecha estimada:** 2026-01-28
**Duración estimada:** 2 horas
**Estado:** [✓] Completado
**Objetivo:** Permitir la generación e impresión de etiquetas PDF universales para cada producto de inventario, con código de barras escaneable.

### 🎯 Entregable Demostrable
> "Desde la vista de Inventario, el usuario puede imprimir una etiqueta en PDF para un SKU específico, que incluya nombre, SKU, código de barras y fecha, lista para escanearse en la estación de mezcla."

### ✅ Tareas Técnicas
- [x] **(1) Acción de Etiquetado en UI:** Agregar botón "🖨️" en la columna de Acciones de `InventoryView` para disparar la generación de etiqueta.
- [x] **(2) Componente de Etiqueta:** Crear componente `LabelTemplate` que use `react-barcode` para renderizar el código de barras (Code 128) y muestre nombre, SKU y fecha de impresión.
- [x] **(3) Modal de Previsualización:** Implementar modal `PrintPreview` con layout específico y estilos `@media print` para optimizar la salida a PDF/impresora del SO.
- [x] **(4) Flujo de Impresión:** Conectar el botón "Imprimir" del modal con `window.print()`, validando que el código de barras sea legible y el SKU coincida con el de base de datos.

### 🧪 Cómo Demostrar
1. Abrir Inventario y seleccionar un producto.
2. Hacer clic en el botón "🖨️" de la fila.
3. Ver el modal de previsualización con la etiqueta y su código de barras.
4. Pulsar "Imprimir" y guardar como PDF.
5. Validar visualmente el layout y, si es posible, escanear el código de barras generado.

> ID de intervención: DOC-20260128-02 · Basado en SPEC `SPEC-ETIQUETADO-PDF` (ARCH-20260128-03).

---

## 📋 MICRO-SPRINT 13 (Sprint 3.1): Seguridad y Roles
**Fecha estimada:** 2026-01-28
**Duración estimada:** 2-3 horas
**Estado:** [✓] Completado
**Objetivo:** Implementar autenticación de usuarios y restricción de funcionalidades sensibles (Ajustes, Configuración) mediante roles (ADMIN/OPERADOR).

### 🎯 Entregable Demostrable
> "Al abrir la app, se bloquea el acceso hasta que el usuario se identifique. Un usuario 'Operador' puede mezclar y ver inventario, pero los botones de 'Importar' y 'Ajustar Stock' desaparecen o están deshabilitados para él. Solo el Admin tiene control total." Implementado con Login View y Route Guards en Inventario. Admin default: admin/admin123.

### ✅ Tareas Técnicas
- [x] **(1) Modelo User:** Actualizar Schema Prisma con tabla `User` (username, hash, role) y migrar DB. `(SOFIA)`
- [x] **(2) AuthService Main:** Servicio en Backend para hash de contraseñas (bcrypt), validación de credenciales y seed inicial de Admin. `(SOFIA)`
- [x] **(3) Login UI:** Pantalla de Login y Contexto de React (`AuthProvider`) para gestionar la sesión en el cliente. `(SOFIA)`
- [x] **(4) Route Guards:** Proteger componentes sensibles. Ocultar botones de 'Ajuste' e 'Importación' en `InventoryView` según el rol. `(SOFIA)`

### 🧪 Cómo Demostrar
1. Abrir la app -> Ver pantalla de Login.
2. Ingresar como Operador -> Ir a Inventario -> Verificar que NO aparece el botón "Ajustar" ni "Importar".
3. Salir (Logout).
4. Ingresar como Admin -> Ir a Inventario -> Verificar que SÍ aparecen los botones.

> ID de intervención: ARCH-20260128-04 · Basado en SPEC `SPEC-SEGURIDAD-LOGIN` y `SPEC-SEGURIDAD`.
> ID de intervención: DOC-20260129-01 · Actualización de estado Sprint 3.1 y cierre de tareas técnicas. Relacionado: IMPL-20260128-04.

## 📋 MICRO-SPRINT 14 (Sprint 2.6): Gestión FIFO y Lotes
**Fecha estimada:** 2026-01-29
**Estado:** [✓] Completado
**Objetivo:** Implementar sistema de rotación de inventario FIFO (First-In-First-Out) mediante gestión de lotes.

### 🎯 Entregable Demostrable
> "Al realizar mezclas, el sistema descuenta automáticamente material del lote más antiguo. En el inventario, se pueden desplegar los detalles de cada producto para ver sus lotes individuales. Implementación completa backend (FIFO) y frontend (tabla anidada de lotes). Importador crea lotes automáticos."

### ✅ Tareas Técnicas
- [x] **(1) DB Relations:** Relacionar `Ingrediente` 1:N `Lote` en Prisma y migrar.
- [x] **(2) Algoritmo FIFO:** Implementar lógica de consumo en cascada en `inventoryService`.
- [x] **(3) Adaptación Importador:** Ajustar importación CSV para crear lotes por diferencia o lote inicial.
- [x] **(4) UI Detalles:** Vista expandible en tabla de inventario para mostrar desglose por lotes.

### 🧪 Cómo Demostrar
1. Tener un producto con 2 lotes: Lote A (50g, Viejo) y Lote B (100g, Nuevo).
2. Hacer mezcla de 70g.
3. Verificar que Lote A queda en 0 (agotado) y Lote B en 80g.

> ID de intervención: DOC-20260129-03 · Actualización de estado Micro-Sprint 14 (Sprint 2.6) y Roadmap. Relacionado: IMPL-20260129-03.

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

- [✓] **Sprint 2.6 - Gestión FIFO y Lotes:** Implementación de rotación FIFO por lotes en inventario y consumo durante mezclas.

### 🗓️ SPRINT 3: Seguridad y Hardening
> **Objetivo:** Bloqueos de seguridad, roles de usuario y manejo de excepciones (mermas).
- [ ] **Login:** Roles Admin vs Igualador.
- [ ] **Modo Kiosco:** Bloqueo de cierre de ventana para igualadores.
- [ ] **Reporte Mermas:** Pantalla de justificación de pérdidas.

- [✓] **Sprint 3.1 - Seguridad y Roles:** Autenticación de usuarios y restricción de funcionalidades sensibles (Ajustes, Configuración) según rol (ADMIN/OPERADOR).

- [/] **Sprint 3.2 - Sistema de Roles y Acceso Abierto (ARCH-20260130-01):** Rediseño del sistema de acceso. Entonador trabaja sin login, Admin requiere autenticación para funciones sensibles.

---

## 📋 MICRO-SPRINT 15 (Sprint 3.2): Sistema de Roles y Acceso Abierto
**Fecha:** 2026-01-30
**Duración estimada:** 3 horas
**Estado:** [/] En Progreso
**ID:** ARCH-20260130-01
**Objetivo:** Permitir que el Entonador use la app sin login. Admin/SuperAdmin requieren autenticación solo para funciones sensibles.

### 🎯 Entregable Demostrable
> "La app abre directamente en modo Entonador. El operador puede mezclar, ver sus mezclas, imprimir etiquetas. Para ver precios o ajustar stock, debe autenticarse como Admin."

### ✅ Tareas Técnicas
- [x] **(1) Schema Roles:** Agregar SUPER_ADMIN, tipos UserRole y TipoMezcla.
- [x] **(2) Tabla Mezcla:** Crear tabla con campos operadorId, tipoMezcla, notas.
- [x] **(3) MezclaService:** CRUD para mezclas con filtros por operador/fecha.
- [x] **(4) Quitar Login Obligatorio:** AuthProvider permite modo invitado.
- [x] **(5) HeaderBar:** Botones Mis Mezclas, Admin, info de usuario.
- [x] **(6) AdminLoginModal:** Modal para autenticación temporal.
- [x] **(7) MisMezclasView:** Vista de mezclas del entonador (7 días).
- [ ] **(8) Modal Finalizar Mezcla:** Agregar notas y tipo de mezcla.
- [ ] **(9) Ocultar Precios:** InventoryView sin costos para no-admin.

### 🧪 Cómo Demostrar
1. Abrir la app -> Entra directo sin login.
2. Ver botón "📋 Mis Mezclas" y usarlo.
3. Clic en "🔐 Admin" -> Modal de login.
4. Con Admin autenticado, ver "📊 Historial" completo.

---

## Deuda Técnica / Notas
- *N/A - Proyecto Nuevo*

- 2026-01-29 · Mantenimiento CI/CD: Se reparó el pipeline de GitHub Actions para generar correctamente los instaladores `.exe` y `.AppImage`. Referencia: CHK_2026-01-29_2045.

> ID de intervención: DOC-20260129-04 · Nota de mantenimiento CI/CD. Respaldo: Checkpoints/CHK_2026-01-29_2045.md.

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
 - 2026-01-28 · [x] Completado Micro-Sprint 10 "Sync Nube (Railway)": Servicio de sincronización, IPC y UI de estado implementados y auditados. (ID: QA-20260128-01)
 - 2026-01-28 · [x] Completado Micro-Sprint 11 "Ajustes de Inventario y Mermas" (Sprint 2.4): Definición de alcance, implementación y tareas técnicas según SPEC-AJUSTES-INVENTARIO. (ID: DOC-20260128-01)
 - 2026-01-28 · [~] Planificado Micro-Sprint 12 "Etiquetado PDF de Inventario" (Sprint 2.5): Definición de alcance y tareas técnicas según SPEC-ETIQUETADO-PDF. (ID: DOC-20260128-02)

- 2026-01-28 · [x] Completado Micro-Sprint 11 "Ajustes de Inventario y Mermas": Funcionalidad de corrección de stock con auditoría. (ID: IMPL-20260128-02)
- 2026-01-28 · [x] Completado Micro-Sprint 12 "Etiquetado PDF": Generador universal de etiquetas de código de barras. (ID: INFRA-20260128-02)

> ID de intervención: DOC-20260128-03 · Actualización de Historial (Micro-Sprints 11 y 12). Respaldo: context/infraestructura/QA_REPORT_20260128_ETIQUETADO.md

> ID de intervención: DOC-20260129-02 · Alta Micro-Sprint 14 (Sprint 2.6) y actualización de Roadmap. Relacionado: ARCH-20260129-02.

- 2026-01-30 · [/] En progreso Micro-Sprint 15 "Sistema de Roles y Acceso Abierto": Implementación del modo Entonador sin login y Admin bajo demanda. (ID: ARCH-20260130-01)
- 2026-02-06 · [✓] Completado Micro-Sprint "Protocolo de Cierre y Etiquetado": Implementación de formulario de metadatos (Cliente/Vehículo), guardado en DB y generación de etiquetas de mezcla con código QR (MZC-xxxx) para impresora Niimbot B1. (ID: DOC-20260206-01)
