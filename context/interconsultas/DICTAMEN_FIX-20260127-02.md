# DICTAMEN TÉCNICO: Auditoría Forense de SayerService Parser

- **ID:** FIX-20260127-02
- **Fecha:** 2026-01-27
- **Solicitante:** REV-20260127-01 (QA Manual)
- **Estado:** ✅ VALIDADO CON OBSERVACIONES

---

## A. Análisis de Causa Raíz

### 1. RegEx de Ingredientes: `^\s*(\d+)\s*:\s*([A-Z0-9-]+)\s+(\d+\.?\d*)\s*\(g\)`

| Aspecto | Evaluación | Riesgo |
|---------|------------|--------|
| Espaciado inicial | ✅ `\s*` tolera 0+ espacios | Bajo |
| Separador índice/SKU | ⚠️ `\s*:\s*` OK pero `\s+` entre SKU y peso es RÍGIDO | **MEDIO** |
| SKU Pattern | ⚠️ `[A-Z0-9-]+` no permite minúsculas ni guiones bajos | **MEDIO** |
| Peso decimal | ✅ `\d+\.?\d*` cubre enteros y decimales | Bajo |
| Sufijo `(g)` | ⚠️ Literal, fallará si Sayer imprime `(gr)` o `g` sin paréntesis | **ALTO** |

#### Hallazgos Críticos:

1. **Espaciado entre SKU y Peso:** La RegEx usa `\s+` (1 o más espacios), pero el archivo real usa **múltiples espacios para alinear columnas**:
   ```
      01 : KT-1400                323.0 (g)
                      ^^^^^^^^^^^^ 16 espacios
   ```
   Esto funciona porque `\s+` captura 1+. **OK, pero frágil.**

2. **Caso SKU con minúsculas:** Si Sayer genera `kt-1400` en vez de `KT-1400`, la RegEx **FALLA silenciosamente**.
   - **Recomendación:** Cambiar a `[A-Za-z0-9_-]+` o usar flag `i`.

3. **Sufijo `(g)` hardcodeado:** Si mañana Sayer imprime:
   - `323.0 g` → **FALLA**
   - `323.0(g)` (sin espacio) → **FALLA**
   - `323,0 (g)` (coma decimal EU) → **FALLA**
   
   **Severidad: ALTA** - Dependencia de formato exacto de tercero.

---

### 2. Configuración de Chokidar

```typescript
this.watcher = watch(this.spoolDir, {
  ignored: /(^|[/\\])\.|\.tmp$/,
  awaitWriteFinish: {
    stabilityThreshold: this.debounceMs,  // viene de config
    pollInterval: 100,
  },
})
```

| Aspecto | Evaluación | Comentario |
|---------|------------|------------|
| `awaitWriteFinish` | ✅ Correcto | Espera estabilidad antes de emitir `add` |
| `stabilityThreshold` | ⚠️ Depende de `debounceMs` | Si es muy bajo (<300ms), puede leer archivo incompleto |
| `pollInterval: 100` | ✅ Razonable | 100ms es buen balance |
| Ignorar `.tmp` | ✅ Correcto | Evita procesar temporales |
| Ignorar dotfiles | ✅ Correcto | Pattern `(^|[/\\])\.` bien construido |

#### Olor de Código Detectado:
- **Doble Debounce:** El código aplica `awaitWriteFinish` en chokidar Y ADEMÁS un `setTimeout` manual en `handleFileAdd`:
  ```typescript
  const timer = setTimeout(() => {
    this.processFile(filePath)
    this.pendingFiles.delete(filePath)
  }, this.debounceMs)
  ```
  Esto significa que el archivo se procesa **después de `debounceMs * 2`** en el peor caso.
  
  **Recomendación:** Eliminar el debounce manual si `awaitWriteFinish` ya está configurado, o documentar la intención.

---

### 3. Manejo de Errores y Robustez

#### ✅ Lo que está bien:
- `try/catch` en `processFile()` captura errores de lectura
- `sendError()` notifica al Renderer
- Validación de `mainWindow.isDestroyed()` antes de enviar IPC

#### ❌ Lo que falta:

| Gap | Impacto | Código afectado |
|-----|---------|-----------------|
| Archivo bloqueado por otro proceso | Crash silencioso o excepción no manejada | `fs.readFileSync()` |
| Archivo con encoding incorrecto (UTF-16, Latin1) | Caracteres basura, parsing fallido | `fs.readFileSync(filePath, "utf-8")` |
| Archivo vacío | `return null` pero sin log específico | `parseReceta()` |
| Archivo muy grande (>1MB) | Bloqueo del event loop | `fs.readFileSync()` |
| Permisos insuficientes | Error EACCES no diferenciado | `fs.readFileSync()` |

#### Código con Gap:
```typescript
// Línea ~100 - Lectura síncrona sin validación de tamaño
const content = fs.readFileSync(filePath, "utf-8")
```

**Recomendación:** Agregar validación de tamaño y usar `fs.promises.readFile` para no bloquear:
```typescript
const stats = await fs.promises.stat(filePath)
if (stats.size > 1_000_000) { // 1MB límite
  throw new Error('Archivo demasiado grande para ser una receta Sayer')
}
const content = await fs.promises.readFile(filePath, "utf-8")
```

---

## B. Justificación de Observaciones

### Severidad de Riesgos:

| Riesgo | Severidad | Probabilidad | Acción |
|--------|-----------|--------------|--------|
| RegEx falla con SKU minúsculas | Media | Baja | Fix preventivo |
| RegEx falla si `(g)` cambia | Alta | Media | Fix obligatorio |
| Doble debounce innecesario | Baja | N/A | Refactor menor |
| Lectura síncrona bloqueante | Media | Baja (archivos pequeños) | Mejora futura |
| Sin validación de encoding | Media | Media | Fix recomendado |

---

## C. Instrucciones de Handoff para SOFIA

### Fixes Recomendados (Prioridad Alta → Baja):

#### 1. **[ALTA]** Flexibilizar RegEx de sufijo de peso
```typescript
// ANTES
const ingredientRegex = /^\s*(\d+)\s*:\s*([A-Z0-9-]+)\s+(\d+\.?\d*)\s*\(g\)/

// DESPUÉS - Acepta (g), (gr), g, gr, sin paréntesis, con/sin espacio
const ingredientRegex = /^\s*(\d+)\s*:\s*([A-Za-z0-9_-]+)\s+(\d+[.,]?\d*)\s*(?:\(g(?:r)?\)|g(?:r)?)?/i
```

#### 2. **[MEDIA]** Eliminar doble debounce
El `awaitWriteFinish` de chokidar ya maneja la estabilidad. El `setTimeout` en `handleFileAdd` es redundante.

```typescript
// OPCIÓN A: Confiar solo en chokidar (recomendado)
private handleFileAdd(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== ".txt" && ext !== ".prn") {
    return
  }
  // Procesar directamente, chokidar ya esperó estabilidad
  this.processFile(filePath)
}
```

#### 3. **[BAJA]** Usar lectura asíncrona
Convertir `processFile` a usar `fs.promises` para no bloquear el event loop de Electron.

---

## D. Veredicto Final

| Categoría | Estado |
|-----------|--------|
| **Funcionalidad** | ✅ Funciona con el formato actual de TEST_RECETA_001.txt |
| **Robustez** | ⚠️ Frágil ante variaciones de formato |
| **Mantenibilidad** | ⚠️ Doble debounce confuso |
| **Seguridad** | ✅ No hay riesgos de seguridad críticos |

### Conclusión:
El código es **funcional para el MVP**, pero tiene **deuda técnica latente** que explotará si Sayer cambia ligeramente su formato de salida. Recomiendo aplicar el Fix #1 (RegEx) antes de producción.

---

**Firmado:** DEBY - Lead Debugger & Traceability Architect
**Referencia:** FIX-20260127-02
