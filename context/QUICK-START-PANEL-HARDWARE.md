# 🎛️ Quick Start: Panel de Control de Hardware Simulator

**ID Intervención:** `IMPL-20260128-01`

---

## ¿Qué cambió?

La simulación automática de peso en `mock-ipc.ts` **ha sido reemplazada** por un **panel de control manual** que permite precisión absoluta en las pruebas de UX de la barra de pesaje.

### Antes (v1.0)
```typescript
iniciarMezcla() {
  // ❌ Incrementaba peso automáticamente cada 100ms
  // ❌ No controlable por el usuario
  // ❌ Imposible probar casos específicos
}
```

### Ahora (v2.0)
```typescript
iniciarMezcla() {
  console.log("[MOCK] El peso será controlado manualmente desde el panel")
  // ✅ Usuario controla peso con slider y botones
  // ✅ Precisión: ±0.1g con botones, rango 0-500g
  // ✅ Control de estabilidad con checkbox
}
```

---

## 📍 Ubicación del Panel

Esquina **inferior derecha** del navegador:

```
┌──────────────────────┐
│   App Principal      │
│                      │
│  ┌────────────────┐  │
│  │ 🎛️ Mock Hard.  │  │
│  │ [📜 Receta]    │  │
│  │ ════[●]═════   │  │
│  │ [-1][-0.1][T..│  │
│  │ ☐ Estable      │  │
│  └────────────────┘  │
└──────────────────────┘
```

---

## 🚀 Cómo Usar

### 1️⃣ Emitir una Receta
```
Pulsa botón: 📜 Emitir Receta
→ Aparecerá una receta de ejemplo en la pantalla principal
```

### 2️⃣ Controlar el Peso
```
OPCIÓN A: Slider
  - Arrastra el slider izquierda/derecha
  - Rango: 0g a 500g
  - Actualización en tiempo real

OPCIÓN B: Botones de Ajuste Fino
  [-1g]    → Resta 1 gramo exacto
  [-0.1g]  → Resta 0.1 gramo
  [Tara]   → Reset a 0g + desmarca "Estable"
  [+0.1g]  → Suma 0.1 gramo
  [+1g]    → Suma 1 gramo exacto
```

### 3️⃣ Simular Estabilización de Báscula
```
☐ Peso Estable
  - SIN MARCAR: peso "flotante" (en medición)
  - MARCADO: peso "confirmado" (listo para registro)
```

---

## 🎯 Caso de Uso: Prueba de Precisión

### Objetivo: Verificar que la barra de pesaje reacciona correctamente a 323.0g

```bash
1. Pulsa "📜 Emitir Receta"
   → Receta aparece, primer ingrediente: 323.0g

2. Usa slider para llegar a ~320g
   → Barra de pesaje muestra progreso

3. Usa botón [-0.1g] / [+0.1g] para ajuste fino
   → Llega exactamente a 323.0g

4. Marca checkbox "☐ Peso Estable"
   → Simula que la báscula confirmó el peso

5. Verifica que:
   ✅ Display numérico muestra "323.0g"
   ✅ Barra visual está al 100%
   ✅ Color cambia si hay validación (según implementación)
```

---

## 🔍 Qué Ver en la Consola del Navegador

Cuando interactúas con el panel, en `F12 → Console`:

```javascript
// Al pulsar "Emitir Receta"
[MOCK] Simulando receta: {numero: "001", ...}

// Al mover slider
[PesoEvent] peso: 150.5, timestamp: 1234567890, estable: false

// Al marcar checkbox
[PesoEvent] peso: 150.5, timestamp: 1234567890, estable: true
```

---

## 💡 Tips & Tricks

### Tara Rápida
```
Pulsa [Tara] en cualquier momento
→ Reinicia peso a 0g
→ Desmarca automáticamente "Estable"
→ Inicia nuevo ciclo de pesaje
```

### Ajuste Fino Automático
```
Slider toscamente, botones finamente:
1. Slider a ~300g
2. Botones ±0.1g para llegar a 323.0g exacto
```

### Múltiples Ciclos
```
1. Pesar 323.0g (primer ingrediente)
2. Pulsar [Tara]
3. Pesar 249.0g (segundo ingrediente)
4. Pulsar [Tara]
... etc
```

---

## 🐛 Si No Ves el Panel

### Checklist:
- [ ] ¿Estás en navegador? (no en Electron)
- [ ] ¿La página cargó completamente? (espera 2-3 segundos)
- [ ] ¿Zoom en 100%? (Ctrl+0 para reset)
- [ ] ¿Scroll hasta abajo-derecha?
- [ ] ¿Consola sin errores? (F12 → Console)

### Debug:
```javascript
// En consola del navegador, escribe:
document.getElementById("mock-hardware-panel")
// Debe retornar el elemento HTML, no null
```

---

## 📊 Especificaciones del Panel

| Propiedad | Valor |
|-----------|-------|
| Posición | Fixed, bottom-right |
| Ancho | 320px |
| Fondo | rgba(20, 20, 30, 0.95) |
| Color Tema | Purple (#8b5cf6) |
| Z-Index | 9999 |
| Peso Mín/Máx | 0g / 500g |
| Precisión | 0.1g |

---

## 🔄 Compatibilidad

**API IPC completamente compatible:**
- ✅ `window.colorManager.onPesoActualizado()` funciona igual
- ✅ Eventos `PesoEvent` emitidos correctamente
- ✅ No hay breaking changes
- ✅ Código del Renderer no necesita modificarse

---

## 📝 Próximas Mejoras

- [ ] Persistencia de peso entre recargas (localStorage)
- [ ] Exportar sesión de prueba a CSV
- [ ] Botón de auto-incremento gradual (opcional)
- [ ] Integración visual con `SessionController` (gris si no hay receta)

---

**Última Actualización:** 2026-01-28
**Tested On:** Firefox + Chrome (navegador)
**Status:** ✅ LISTO PARA USO
