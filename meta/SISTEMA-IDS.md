# Sistema de Identificadores Únicos - Metodología INTEGRA v2.1

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Objetivo:** Garantizar trazabilidad total de cada intervención mediante IDs únicos

---

## 🎯 Propósito

Cada agente genera un ID único para sus intervenciones principales, permitiendo:
- ✅ **Trazabilidad bidireccional** código ↔ documentación
- ✅ **Auditoría completa** de cambios y decisiones
- ✅ **Búsqueda rápida** de contexto histórico
- ✅ **Handoffs claros** entre agentes

---

## 📋 Formato de IDs por Agente

| Agente | Prefijo | Formato | Ejemplo | Uso Principal |
|--------|---------|---------|---------|---------------|
| **INTEGRA** | `ARCH` | `ARCH-YYYYMMDD-NN` | `ARCH-20251226-01` | Decisiones arquitectónicas, ADRs |
| **SOFIA** | `IMPL` | `IMPL-YYYYMMDD-NN` | `IMPL-20251226-01` | Implementaciones de features |
| **GEMINI** | `INFRA` | `INFRA-YYYYMMDD-NN` | `INFRA-20251226-01` | Configuraciones de infraestructura |
| **DEBY** | `FIX` | `FIX-YYYYMMDD-NN` | `FIX-20251226-01` | Debugging y correcciones |
| **CRONISTA** | `DOC` | `DOC-YYYYMMDD-NN` | `DOC-20251226-01` | Actualizaciones de documentación |

### Componentes del ID

```
ARCH-20251226-01
│    │        │
│    │        └─ Correlativo del día (01, 02, 03...)
│    └────────── Fecha (YYYYMMDD)
└─────────────── Prefijo del agente
```

---

## 📁 Dónde Documentar

| Agente | Carpeta | Nombre de Archivo | Contenido |
|--------|---------|-------------------|-----------|
| **INTEGRA** | `context/decisions/` | `ADR-[ID].md` | Architecture Decision Record |
| **SOFIA** | `Checkpoints/` | `CHK_[ID].md` | Checkpoint de implementación |
| **GEMINI** | `context/infraestructura/` | `CONFIG_[ID].md` | Configuración de infraestructura |
| **DEBY** | `context/interconsultas/` | `DICTAMEN_[ID].md` | Dictamen técnico de debugging |
| **CRONISTA** | `Checkpoints/` | `UPDATE_[ID].md` | Actualización de documentación |

---

## 🏷️ Marca de Agua en Código

Todos los agentes deben inyectar una "marca de agua" en el código que modifican para garantizar trazabilidad.

### INTEGRA - Decisiones Arquitectónicas

```typescript
/**
 * 🏗️ ARCH REFERENCE: ARCH-20251226-01
 * 📄 SEE: context/decisions/ADR-ARCH-20251226-01.md
 * 🤖 AUTHOR: INTEGRA (Gemini 3 Pro)
 * 📋 DECISION: Usar Firestore en lugar de PostgreSQL para escalabilidad
 */
import { getFirestore } from 'firebase/firestore';

export const db = getFirestore();
```

### SOFIA - Implementaciones

```typescript
/**
 * ⚙️ IMPL REFERENCE: IMPL-20251226-01
 * 📄 SEE: Checkpoints/CHK_IMPL-20251226-01.md
 * 🤖 AUTHOR: SOFIA (Claude Haiku 4.5)
 * 📋 FEATURE: Sistema de autenticación con Firebase Auth
 */
export class AuthService {
  async login(email: string, password: string): Promise<User> {
    // Implementación...
  }
}
```

### GEMINI - Configuraciones de Infraestructura

```yaml
# 🔍 INFRA REFERENCE: INFRA-20251226-01
# 📄 SEE: context/infraestructura/CONFIG_INFRA-20251226-01.md
# 🤖 AUTHOR: GEMINI (Gemini 3 Pro)
# 📋 CONFIG: Vercel deployment con variables de entorno seguras

env:
  - NEXT_PUBLIC_API_URL
  - DATABASE_URL
  - SECRET_KEY
```

### DEBY - Fixes y Debugging

```typescript
/**
 * 🔧 FIX REFERENCE: FIX-20251226-01
 * 📄 SEE: context/interconsultas/DICTAMEN_FIX-20251226-01.md
 * 🤖 AUTHOR: DEBY (Claude Opus 4.5)
 * 🐛 BUG: Cálculo incorrecto de impuestos con descuentos
 */
export function calculateTotalWithDiscount(subtotal: number, discount: number): number {
  // Fix: Cambiar + por - en el cálculo
  return subtotal - (subtotal * discount / 100);
}
```

### CRONISTA - Actualizaciones de Documentación

```markdown
<!-- 📝 DOC REFERENCE: DOC-20251226-01 -->
<!-- 📄 SEE: Checkpoints/UPDATE_DOC-20251226-01.md -->
<!-- 🤖 AUTHOR: CRONISTA (GPT-5.1) -->
<!-- 📋 UPDATE: Actualización de estados en PROYECTO.md -->

## Sprint 3 - Actualización 2025-12-26

- [✓] Implementar sistema de pagos
  **Completado:** 2025-12-26
  **Implementado por:** SOFIA (IMPL-20251226-01)
  ...
```

---

## 📝 Templates de Documentación

### Template ADR (INTEGRA)

```markdown
# ADR-ARCH-YYYYMMDD-NN: [Título de la Decisión]

**ID:** ARCH-YYYYMMDD-NN  
**Fecha:** YYYY-MM-DD  
**Estado:** [Propuesta | Aceptada | Rechazada | Obsoleta]  
**Autor:** INTEGRA (Gemini 3 Pro)

## Contexto

[Descripción del problema o situación que requiere una decisión]

## Decisión

[La decisión tomada]

## Justificación

[Por qué se tomó esta decisión]

## Consecuencias

### Positivas
- [Beneficio 1]
- [Beneficio 2]

### Negativas
- [Trade-off 1]
- [Trade-off 2]

## Alternativas Consideradas

1. **Alternativa 1:** [Descripción] - Rechazada porque [razón]
2. **Alternativa 2:** [Descripción] - Rechazada porque [razón]

## Referencias

- SPEC: `context/SPEC-XXX.md`
- Código afectado: `ruta/archivo.ts`

---
**Firma:** INTEGRA  
**Timestamp:** YYYY-MM-DD HH:MM:SS
```

### Template Checkpoint (SOFIA)

```markdown
# CHK_IMPL-YYYYMMDD-NN: [Título del Checkpoint]

**ID:** IMPL-YYYYMMDD-NN  
**Fecha:** YYYY-MM-DD  
**Agente:** SOFIA (Claude Haiku 4.5)  
**Duración:** X horas

## Resumen

[Descripción breve de lo implementado]

## Cambios Realizados

### Archivos Modificados
- `ruta/archivo1.ts` - [Descripción]
- `ruta/archivo2.ts` - [Descripción]

### Archivos Nuevos
- `ruta/archivo3.ts` - [Descripción]

## Tests

- Tests unitarios: X/X pasando
- Coverage: XX%
- Tests de integración: X/X pasando

## Soft Gates

- [✅] Gate 1: Compilación
- [✅] Gate 2: Testing
- [✅] Gate 3: Revisión (pendiente GEMINI)
- [✅] Gate 4: Documentación

## Próximos Pasos

- [ ] Revisión de GEMINI
- [ ] Despliegue a staging
- [ ] Validación de Frank

---
**Firma:** SOFIA  
**Timestamp:** YYYY-MM-DD HH:MM:SS
```

### Template Config (GEMINI)

```markdown
# CONFIG_INFRA-YYYYMMDD-NN: [Título de la Configuración]

**ID:** INFRA-YYYYMMDD-NN  
**Fecha:** YYYY-MM-DD  
**Agente:** GEMINI (Gemini 3 Pro)  
**Plataforma:** [Vercel | Render | GCP | Hostinger]

## Objetivo

[Qué se está configurando y por qué]

## Configuración Aplicada

### Variables de Entorno
```yaml
VARIABLE_1: [Descripción]
VARIABLE_2: [Descripción]
```

### Servicios Configurados
- [Servicio 1]: [Configuración]
- [Servicio 2]: [Configuración]

## Validación

- [ ] Configuración aplicada en staging
- [ ] Tests de integración pasando
- [ ] Configuración aplicada en producción

## Riesgos Identificados

- [Riesgo 1]: [Mitigación]
- [Riesgo 2]: [Mitigación]

---
**Firma:** GEMINI  
**Timestamp:** YYYY-MM-DD HH:MM:SS
```

### Template Dictamen (DEBY)

```markdown
# DICTAMEN_FIX-YYYYMMDD-NN: [Título del Error]

**ID:** FIX-YYYYMMDD-NN  
**Fecha:** YYYY-MM-DD  
**Estado:** ✅ VALIDADO  
**Agente:** DEBY (Claude Opus 4.5)

## A. Análisis de Causa Raíz

[Descripción técnica profunda del problema]

## B. Justificación de la Solución

[Por qué esta solución es la más eficiente y respeta la metodología]

## C. Instrucciones de Handoff para SOFIA

[Qué debe hacer SOFIA a continuación o qué vigilar]

## D. Código Aplicado

```typescript
// Código con marca de agua
/**
 * 🔧 FIX REFERENCE: FIX-YYYYMMDD-NN
 * ...
 */
```

## E. Verificación

Comando para validar el fix:
```bash
pnpm test --filter @proyecto/modulo
```

---
**Firma:** DEBY  
**Timestamp:** YYYY-MM-DD HH:MM:SS
```

---

## 🔍 Búsqueda y Trazabilidad

### Buscar por ID en el Código

```bash
# Buscar todas las referencias a un ID específico
grep -r "IMPL-20251226-01" .

# Buscar todos los IDs de SOFIA
grep -r "IMPL-" . --include="*.ts" --include="*.tsx"

# Buscar todos los fixes de DEBY
grep -r "FIX-" . --include="*.ts"
```

### Buscar en Documentación

```bash
# Buscar ADR específico
find context/decisions -name "*ARCH-20251226-01*"

# Buscar todos los checkpoints de SOFIA
find Checkpoints -name "CHK_IMPL-*"

# Buscar dictámenes de DEBY
find context/interconsultas -name "DICTAMEN_FIX-*"
```

---

## 📊 Métricas y Reportes

### Contador de Intervenciones por Agente

```bash
# Contar ADRs de INTEGRA
ls context/decisions/ADR-ARCH-* | wc -l

# Contar implementaciones de SOFIA
ls Checkpoints/CHK_IMPL-* | wc -l

# Contar fixes de DEBY
ls context/interconsultas/DICTAMEN_FIX-* | wc -l
```

### Timeline de Cambios

```bash
# Ver todos los IDs ordenados por fecha
grep -rh "REFERENCE:" . --include="*.ts" --include="*.md" | sort
```

---

## ✅ Buenas Prácticas

### Para INTEGRA
- Genera ADR para decisiones arquitectónicas importantes
- Usa ID en comentarios de configuración base
- Referencia ID en PROYECTO.md cuando asignas tareas

### Para SOFIA
- Genera checkpoint al completar cada feature significativa
- Inyecta ID en el código de la feature principal
- Referencia IDs de ADRs de INTEGRA en tus checkpoints

### Para GEMINI
- Documenta cada configuración de infraestructura
- Usa ID en archivos de configuración (YAML, JSON)
- Referencia IDs de SOFIA cuando validas implementaciones

### Para DEBY
- SIEMPRE genera ID antes de escribir código
- Dictamen técnico es obligatorio, no opcional
- Marca de agua en código garantiza trazabilidad

### Para CRONISTA
- Referencia IDs de otros agentes en notas de PROYECTO.md
- Genera ID para actualizaciones masivas de documentación
- Mantén timeline de IDs en orden cronológico

---

## 🚫 Errores Comunes a Evitar

❌ **No usar ID:** Código sin referencia = pérdida de contexto  
❌ **ID duplicado:** Siempre incrementar correlativo del día  
❌ **Documentación sin ID:** Archivo sin ID = no trazable  
❌ **ID sin documento:** ID en código pero sin archivo de respaldo  
❌ **Formato incorrecto:** Respetar siempre `PREFIJO-YYYYMMDD-NN`

---

**Versión:** 1.0  
**Última Actualización:** 2025-12-26  
**Mantenido por:** Metodología INTEGRA v2.1
