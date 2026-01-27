# DICTAMEN TÉCNICO: Análisis Forense de Arquitectura Híbrida ColorManager

- **ID:** FIX-20260127-01
- **Fecha:** 2026-01-27
- **Solicitante:** INTEGRA (Arquitecto)
- **Estado:** ✅ VALIDADO

---

## A. Análisis de Causa Raíz (Preventivo)

### 🔴 FOCO 1: Integridad de Datos - Colisión de IDs en Sincronización

**Síntoma Potencial:**  
Dos PCs crean registros offline → al sincronizar → `UNIQUE constraint failed: mezclas.id`

**Análisis Forense:**

El problema clásico de sistemas distribuidos: ¿quién manda los IDs? Hay 3 escenarios de conflicto:

| Escenario | Riesgo | Probabilidad |
|-----------|--------|--------------|
| Auto-increment SQLite en cada PC | **CRÍTICO** - PC1 crea mezcla #100, PC2 también crea #100 | ALTA |
| Timestamps como ID | **MEDIO** - Dos mezclas en el mismo milisegundo | BAJA |
| UUIDs puros | **BAJO** - Colisión estadísticamente imposible | DESPRECIABLE |

**Veredicto:** El uso de `INTEGER PRIMARY KEY AUTOINCREMENT` en SQLite **es incompatible** con sincronización multi-nodo.

**🩹 Mitigación Obligatoria:**

```typescript
// ❌ PROHIBIDO en sistema multi-nodo
model Mezcla {
  id Int @id @default(autoincrement())
}

// ✅ OBLIGATORIO: UUIDs con prefijo de nodo
model Mezcla {
  id String @id @default(uuid()) // Ej: "550e8400-e29b-41d4-a716-446655440000"
  nodeId String // Identificador único de la PC (ej: "TALLER-PC01")
  localSeq Int  // Secuencia local para trazabilidad humana
}
```

**Estrategia de ID Compuesto:**
```
[PREFIJO_NODO]-[YYYYMMDD]-[SEQ_LOCAL]
Ejemplo: MZL-PC01-20260127-0042
```

Esto permite:
1. **Unicidad global garantizada** (nodo + fecha + secuencia)
2. **Legibilidad humana** (el operador sabe qué PC creó el registro)
3. **Ordenamiento temporal** por fecha embebida

---

### 🔴 FOCO 2: Seguridad de BD Local (.db expuesto)

**Síntoma Potencial:**  
Empleado deshonesto copia `colormanager.db` a USB → extrae costos, fórmulas, márgenes.

**Análisis Forense:**

SQLite es un **archivo plano**. Cualquiera con acceso al filesystem puede:
1. Copiar el archivo `.db`
2. Abrirlo con DB Browser for SQLite
3. Leer TODA la información sin contraseña

**Matriz de Riesgos:**

| Dato Sensible | Impacto de Fuga | Probabilidad |
|---------------|-----------------|--------------|
| Fórmulas de mezcla (recetas) | ALTO - Competidores pueden copiar | MEDIA |
| Costos unitarios de pigmentos | ALTO - Pérdida de ventaja comercial | MEDIA |
| Mermas y ajustes | MEDIO - Auditoría interna expuesta | BAJA |
| Datos de clientes | BAJO - Solo nombres de trabajos | BAJA |

**🩹 Mitigaciones por Capas:**

**Capa 1: Cifrado de BD (SQLCipher)**
```bash
# Usar SQLCipher en lugar de SQLite vanilla
pnpm add @journeyapps/sqlcipher
```

```typescript
// En Prisma, no hay soporte nativo. Alternativa:
// 1. Usar better-sqlite3 con plugin de cifrado
// 2. O cifrar/descifrar archivo al abrir/cerrar app
```

⚠️ **Advertencia:** SQLCipher agrega complejidad. Evaluar si el riesgo justifica el costo.

**Capa 2: Ubicación Protegida**
```typescript
// ❌ PROHIBIDO: Guardar en carpeta accesible
const dbPath = 'C:\\ColorManager\\data.db'

// ✅ RECOMENDADO: Usar AppData con permisos de usuario
import { app } from 'electron'
const dbPath = path.join(app.getPath('userData'), 'colormanager.db')
// Resulta en: C:\Users\[USER]\AppData\Roaming\ColorManager\colormanager.db
```

**Capa 3: Ofuscación de Columnas Críticas**
```sql
-- Costos nunca en texto plano
ALTER TABLE ingredientes ADD COLUMN costo_cifrado BLOB;
-- Descifrar solo en memoria con key de sesión
```

**Capa 4: Control de Acceso a Windows**
- Crear usuario Windows específico `colormanager-svc`
- La BD solo es legible por ese usuario
- El operador NO tiene permisos de administrador

**Veredicto:** Para un taller automotriz, **Capa 2 + Capa 4** son suficientes. SQLCipher es overkill salvo que el cliente maneje secretos industriales de alto valor.

---

### 🔴 FOCO 3: Rendimiento SQLite con Escrituras Masivas

**Síntoma Potencial:**  
Báscula emite 10 lecturas/segundo → 36,000 registros/hora → UI se congela, BD se corrompe.

**Análisis Forense:**

SQLite tiene **un solo writer a la vez** (serialized writes). Problema:

```
Báscula: [100.5g] → [100.6g] → [100.7g] → [100.8g]  (cada 100ms)
         ↓           ↓           ↓           ↓
SQLite:  WRITE       WAIT        WAIT        WAIT
         |___10ms___|___queue___|___queue___|
```

Cada INSERT fuerza un `fsync()` al disco. Con WAL mode ayuda, pero no es magia.

**Prueba de Estrés Simulada:**

| Escenario | Writes/seg | Resultado Esperado |
|-----------|------------|-------------------|
| Logging cada lectura | 10 | ⚠️ Factible pero innecesario |
| Logging cada 500ms | 2 | ✅ Óptimo |
| Logging solo en "estabilización" | 0.1-0.5 | ✅ Ideal |

**🩹 Mitigaciones:**

**Estrategia 1: NO guardar todo - Solo eventos significativos**

```typescript
// ❌ ANTIPATRÓN: Guardar cada lectura
scale.on('data', (weight) => {
  db.insert({ peso: weight, timestamp: Date.now() }) // 10 writes/sec = MUERTE
})

// ✅ PATRÓN CORRECTO: Buffer + Debounce + Solo estados finales
class WeightBuffer {
  private readings: number[] = []
  private stableWeight: number | null = null
  
  addReading(weight: number) {
    this.readings.push(weight)
    
    // Solo guardar cuando el peso se ESTABILIZA (3 lecturas iguales)
    if (this.isStable()) {
      this.persistFinalWeight(weight)
      this.readings = []
    }
  }
  
  private isStable(): boolean {
    const last3 = this.readings.slice(-3)
    return last3.length === 3 && 
           last3.every(w => Math.abs(w - last3[0]) < 0.1) // Tolerancia 0.1g
  }
}
```

**Estrategia 2: Escritura Batch Asíncrona**

```typescript
// Buffer en memoria, flush cada 5 segundos o 50 registros
const writeQueue: WeightEvent[] = []

function queueWrite(event: WeightEvent) {
  writeQueue.push(event)
  if (writeQueue.length >= 50) flushToDb()
}

setInterval(flushToDb, 5000)

async function flushToDb() {
  if (writeQueue.length === 0) return
  const batch = writeQueue.splice(0, writeQueue.length)
  await db.weightEvents.createMany({ data: batch }) // 1 transaction, N inserts
}
```

**Estrategia 3: Configuración WAL Obligatoria**

```sql
-- Ejecutar al inicializar conexión
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;  -- Balance seguridad/velocidad
PRAGMA cache_size = -64000;   -- 64MB cache
PRAGMA temp_store = MEMORY;
```

**Veredicto:** El sistema **NO debe guardar cada lectura de báscula**. Solo debe persistir:
1. Peso inicial (tara)
2. Peso final (estable)
3. Eventos de "vertido detectado" (delta > umbral)

---

## B. Justificación de las Recomendaciones

| Recomendación | Costo Dev | Impacto | Prioridad |
|---------------|-----------|---------|-----------|
| UUIDs + nodeId para IDs | 2h | Evita corrupción de datos | 🔴 CRÍTICA |
| WAL mode en SQLite | 5min | +10x rendimiento escritura | 🔴 CRÍTICA |
| Buffer de pesaje (no guardar todo) | 4h | Evita freeze de UI | 🔴 CRÍTICA |
| AppData para ubicación de .db | 30min | Seguridad básica | 🟡 ALTA |
| SQLCipher (cifrado) | 8h+ | Protege secretos | 🟢 OPCIONAL |
| Usuario Windows dedicado | 1h | Hardening OS-level | 🟢 OPCIONAL |

---

## C. Instrucciones de Handoff para INTEGRA/SOFIA

### Pre-requisitos antes de escribir código:

1. **Schema Prisma:** Cambiar todos los `@id @default(autoincrement())` por:
   ```prisma
   model Base {
     id        String   @id @default(uuid())
     nodeId    String   // Setear al inicializar app
     createdAt DateTime @default(now())
   }
   ```

2. **Archivo de Config de Nodo:** Crear `node-config.json` en AppData al primer arranque:
   ```json
   {
     "nodeId": "TALLER-PC01",
     "installedAt": "2026-01-27T10:30:00Z",
     "dbPath": "C:\\Users\\Operador\\AppData\\Roaming\\ColorManager\\data.db"
   }
   ```

3. **Servicio de Báscula:** Implementar con patrón Observer + Buffer:
   ```
   Scale → RawDataStream → WeightBuffer → StableWeightEvent → Database
                              ↓
                         UI (realtime, sin DB)
   ```

4. **Inicialización de SQLite:** Siempre ejecutar PRAGMAs de optimización.

### Checklist de Validación (para QA):

- [ ] Crear 100 registros en PC1 offline
- [ ] Crear 100 registros en PC2 offline
- [ ] Sincronizar ambas → 200 registros únicos en Postgres
- [ ] Simular 10 lecturas/segundo de báscula por 1 hora → UI responsive
- [ ] Intentar abrir .db con DB Browser → Verificar que está en AppData

---

## D. Diagrama de Flujo de Datos Seguro

```
┌─────────────────────────────────────────────────────────────────┐
│                         PC TALLER                                │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────┐   │
│  │ Báscula  │───►│ WeightBuffer │───►│ StableWeightEvent   │   │
│  │ (Serial) │    │ (Memoria)    │    │ (Solo pesos finales)│   │
│  └──────────┘    └──────────────┘    └──────────┬──────────┘   │
│                         │                        │              │
│                         ▼ (Realtime)             ▼ (Batch)      │
│                  ┌──────────────┐         ┌──────────────┐      │
│                  │  React UI   │         │   SQLite     │      │
│                  │ (Indicador) │         │ (WAL Mode)   │      │
│                  └──────────────┘         └──────┬───────┘      │
│                                                  │              │
│                                          ┌───────▼───────┐      │
│                                          │  Sync Queue   │      │
│                                          │ (Background)  │      │
│                                          └───────┬───────┘      │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │ (HTTPS)
                                                   ▼
                                          ┌───────────────┐
                                          │  PostgreSQL   │
                                          │   (Railway)   │
                                          └───────────────┘
```

---

**Firma Digital:**  
`DEBY-FORENSE // FIX-20260127-01 // DICTAMEN PREVENTIVO ARQUITECTURA`

---

*Este dictamen debe ser revisado por INTEGRA antes de iniciar el Micro-Sprint de Inicialización.*
