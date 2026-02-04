# SPEC: Sistema de Etiquetas QR para Inventario

**ID:** ARCH-20260204-01  
**Autor:** INTEGRA  
**Fecha:** 2026-02-04  
**Estado:** Aprobado

---

## 1. Resumen Ejecutivo

Sistema de generación e impresión de etiquetas QR para identificación única de botes en el inventario de ColorManager. Permite etiquetar cada unidad física con un código QR que contiene el identificador único del lote (ej: `KT-1400-01`), facilitando el seguimiento FIFO y la validación durante el proceso de mezclado.

La impresora objetivo es la **Niimbot B1** (USB/Bluetooth) con etiquetas de 40x30mm o 50x30mm.

---

## 2. Contexto y Problema

### 2.1 Situación Actual

- Los códigos de barras físicos de productos Sayer **NO coinciden** con las claves internas del sistema ColorManager
- Actualmente existe un sistema básico de impresión de etiquetas con códigos de barras en [LabelTemplate.tsx](../../src/renderer/components/ui/LabelTemplate.tsx) usando `react-barcode`
- Las etiquetas actuales imprimen el SKU del ingrediente (ej: `KT-1400`) pero **no identifican el lote específico**
- El sistema FIFO ya implementado usa `numeroLote` (ej: `LOTE-INICIAL-KT-1400`) para rastrear unidades

### 2.2 Problema a Resolver

1. **Identificación Física:** No hay forma de saber qué bote físico corresponde a qué lote en el sistema
2. **Validación de Mezclas:** El auditor actualmente valida solo SKU base, pero no puede confirmar que se está usando el lote correcto (más antiguo)
3. **Trazabilidad:** Imposible rastrear un bote específico desde entrada hasta consumo
4. **Impresión Dedicada:** La impresión actual usa `window.print()` del navegador, no una impresora de etiquetas dedicada

### 2.3 Usuarios Afectados

| Usuario | Beneficio |
|---------|-----------|
| Operador de Taller | Identificar rápidamente el bote correcto para cada mezcla |
| Almacenista | Etiquetar nuevos ingresos al inventario |
| Auditor/Supervisor | Verificar cumplimiento FIFO en auditorías |

---

## 3. Solución Propuesta

### 3.1 Descripción General

Implementar un **módulo de etiquetas QR** dentro de la vista de Inventario que permita:

1. **Generar códigos QR** con el identificador único de cada lote
2. **Previsualizar etiquetas** antes de imprimir
3. **Imprimir directamente** a la Niimbot B1 (USB o Bluetooth)
4. **Impresión masiva** de todas las etiquetas del inventario

### 3.2 Formato del Código de Etiqueta

```
[SKU]-[##]
```

Donde:
- `SKU` = Código del ingrediente (ej: `KT-1400`)
- `##` = Número secuencial del bote (01, 02, 03...)

**Ejemplos:**
- `KT-1400-01` → Primer bote de KT-1400
- `KT-1400-02` → Segundo bote de KT-1400
- `ZJ-0800-03` → Tercer bote de ZJ-0800

### 3.3 Flujo de Usuario

#### Flujo A: Etiquetar Lote Individual
1. Usuario abre **Inventario** → Expande fila de ingrediente
2. En la sub-tabla de lotes, click en **🏷️ Etiqueta**
3. Se abre modal con **preview** de la etiqueta
4. Click en **🖨️ Imprimir** → Se envía a Niimbot B1
5. Etiqueta sale de la impresora lista para pegar

#### Flujo B: Etiquetar Todo el Inventario
1. Usuario abre **Inventario** → Click en **🏷️ Imprimir Todas**
2. Modal muestra **lista de etiquetas** a imprimir (todos los lotes activos)
3. Usuario confirma → Sistema imprime secuencialmente
4. Barra de progreso muestra avance

#### Flujo C: Nuevo Ingreso con Etiqueta
1. Admin hace **➕ Ingreso** de stock (flujo existente)
2. Al guardar, sistema pregunta **"¿Imprimir etiqueta?"**
3. Si acepta, imprime automáticamente etiqueta del nuevo lote

### 3.4 Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         RENDERER (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  InventoryView   │───►│  QRLabelModal    │                   │
│  │  (expandir lote) │    │  - Preview QR    │                   │
│  └──────────────────┘    │  - Imprimir      │                   │
│                          └────────┬─────────┘                   │
│                                   │                              │
│                    window.colorManager.imprimirEtiquetaQR()     │
│                                   │                              │
└───────────────────────────────────┼─────────────────────────────┘
                                    │ IPC
┌───────────────────────────────────┼─────────────────────────────┐
│                          MAIN (Electron)                         │
├───────────────────────────────────┼─────────────────────────────┤
│                                   ▼                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   qrLabelService.ts                       │   │
│  │  - generateQRCode(codigo: string): Buffer                 │   │
│  │  - printToNiimbot(qrBuffer, labelData)                    │   │
│  │  - printAllLabels(lotes[])                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│           ┌──────────────┼───────────────┐                      │
│           ▼              ▼               ▼                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  qrcode     │  │  node-hid   │  │  serialport │              │
│  │  (npm)      │  │  (USB HID)  │  │  (Bluetooth │              │
│  └─────────────┘  └─────────────┘  │   Serial)   │              │
│                                     └─────────────┘              │
│                          │                                       │
│                          ▼                                       │
│                   ┌─────────────┐                                │
│                   │  NIIMBOT B1 │                                │
│                   │  (Hardware) │                                │
│                   └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Requisitos

### 4.1 Funcionales

- [ ] **RF-01:** Generar código QR a partir del identificador de lote
- [ ] **RF-02:** Mostrar preview de etiqueta antes de imprimir (QR + texto legible)
- [ ] **RF-03:** Imprimir etiqueta individual desde sub-tabla de lotes
- [ ] **RF-04:** Imprimir todas las etiquetas de lotes activos (batch)
- [ ] **RF-05:** Opción de imprimir etiqueta al crear nuevo lote (ajuste de stock)
- [ ] **RF-06:** Detectar automáticamente la impresora Niimbot conectada (USB)
- [ ] **RF-07:** Generar número secuencial automático para nuevos lotes

### 4.2 No Funcionales

- [ ] **RNF-01:** Tiempo de generación de QR < 100ms
- [ ] **RNF-02:** Tiempo de impresión < 3s por etiqueta
- [ ] **RNF-03:** El QR debe ser legible con cámaras de celular estándar
- [ ] **RNF-04:** La etiqueta debe resistir manchas de tinte (plastificado opcional)
- [ ] **RNF-05:** Compatibilidad con Windows 10/11 (drivers Niimbot oficiales)

---

## 5. Diseño Técnico

### 5.1 Modelo de Datos

#### Modificación al Schema Prisma

```prisma
model Lote {
  id               String      @id
  ingredienteId    String
  numeroLote       String      @unique
  codigoEtiqueta   String?     @unique  // NUEVO: "KT-1400-01"
  cantidad         Float
  fechaVencimiento DateTime?
  estado           String      @default("activo")
  etiquetaImpresa  Boolean     @default(false)  // NUEVO: Tracking
  createdAt        DateTime    @default(now())
  
  ingrediente      Ingrediente @relation(fields: [ingredienteId], references: [id], onDelete: Cascade)

  @@index([estado])
  @@index([ingredienteId])
  @@index([codigoEtiqueta])  // NUEVO: Índice para búsquedas rápidas
}
```

**Campos nuevos:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `codigoEtiqueta` | `String?` | Código único para QR (ej: `KT-1400-01`) |
| `etiquetaImpresa` | `Boolean` | Flag para saber si ya se imprimió |

#### Generación del Código de Etiqueta

```typescript
/**
 * Genera código de etiqueta único para un nuevo lote
 * Formato: [SKU]-[##] donde ## es secuencial por ingrediente
 */
async function generarCodigoEtiqueta(ingredienteSKU: string): Promise<string> {
  const prisma = getPrismaClient()
  
  // Contar lotes existentes de este ingrediente
  const count = await prisma.lote.count({
    where: {
      ingrediente: { codigo: ingredienteSKU },
      codigoEtiqueta: { not: null }
    }
  })
  
  const secuencial = String(count + 1).padStart(2, '0')
  return `${ingredienteSKU}-${secuencial}`
}
```

### 5.2 Servicio de Etiquetas QR

**Archivo:** `src/main/services/qrLabelService.ts`

```typescript
/**
 * Servicio de Generación e Impresión de Etiquetas QR
 * 
 * ID Intervención: ARCH-20260204-01
 */

import QRCode from 'qrcode'
import { getPrismaClient } from '../database/db'

export interface EtiquetaData {
  codigo: string       // "KT-1400-01"
  nombre: string       // "NEGRO BRILLANTE"
  sku: string          // "KT-1400"
  loteId: string       // UUID del lote
}

export interface PrintResult {
  success: boolean
  error?: string
  printed?: number
}

/**
 * Genera imagen QR como Buffer PNG
 */
export async function generateQRCode(
  codigo: string,
  options?: { size?: number }
): Promise<Buffer> {
  const size = options?.size || 200
  
  return QRCode.toBuffer(codigo, {
    type: 'png',
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

/**
 * Genera QR como Data URL para preview en UI
 */
export async function generateQRDataURL(codigo: string): Promise<string> {
  return QRCode.toDataURL(codigo, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M'
  })
}

/**
 * Obtiene datos de etiqueta para un lote
 */
export async function getLabelData(loteId: string): Promise<EtiquetaData | null> {
  const prisma = getPrismaClient()
  
  const lote = await prisma.lote.findUnique({
    where: { id: loteId },
    include: { ingrediente: true }
  })
  
  if (!lote) return null
  
  // Si no tiene código de etiqueta, generarlo
  let codigo = lote.codigoEtiqueta
  if (!codigo) {
    codigo = await generarCodigoEtiqueta(lote.ingrediente.codigo)
    await prisma.lote.update({
      where: { id: loteId },
      data: { codigoEtiqueta: codigo }
    })
  }
  
  return {
    codigo,
    nombre: lote.ingrediente.nombre,
    sku: lote.ingrediente.codigo,
    loteId: lote.id
  }
}

/**
 * Imprime etiqueta a Niimbot B1
 * Usa el driver del sistema operativo
 */
export async function printToNiimbot(
  etiqueta: EtiquetaData
): Promise<PrintResult> {
  try {
    // Generar QR
    const qrBuffer = await generateQRCode(etiqueta.codigo, { size: 150 })
    
    // Estrategia de impresión:
    // 1. Intentar con node-hid (USB HID directo)
    // 2. Fallback a impresora del sistema vía canvas
    
    // Por ahora usamos estrategia de fallback universal:
    // Generar imagen de etiqueta completa y enviar a impresora del sistema
    const labelImage = await renderLabelImage(etiqueta, qrBuffer)
    
    // Usar electron-pos-printer o similar
    await printImageToDefault(labelImage)
    
    // Marcar como impresa
    const prisma = getPrismaClient()
    await prisma.lote.update({
      where: { id: etiqueta.loteId },
      data: { etiquetaImpresa: true }
    })
    
    return { success: true, printed: 1 }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Imprime todas las etiquetas de lotes activos
 */
export async function printAllLabels(): Promise<PrintResult> {
  const prisma = getPrismaClient()
  
  const lotes = await prisma.lote.findMany({
    where: {
      estado: { in: ['activo', 'parcial'] },
      etiquetaImpresa: false
    },
    include: { ingrediente: true }
  })
  
  let printed = 0
  const errors: string[] = []
  
  for (const lote of lotes) {
    const etiqueta = await getLabelData(lote.id)
    if (etiqueta) {
      const result = await printToNiimbot(etiqueta)
      if (result.success) {
        printed++
      } else {
        errors.push(`${lote.numeroLote}: ${result.error}`)
      }
    }
  }
  
  return {
    success: errors.length === 0,
    printed,
    error: errors.length > 0 ? errors.join('; ') : undefined
  }
}
```

### 5.3 Componentes UI

#### QRLabelModal.tsx

**Archivo:** `src/renderer/components/ui/QRLabelModal.tsx`

```tsx
/**
 * Modal de Preview e Impresión de Etiqueta QR
 * 
 * ID Intervención: ARCH-20260204-01
 */
import React, { useEffect, useState } from 'react'

interface Props {
  isOpen: boolean
  loteId: string
  onClose: () => void
}

interface EtiquetaData {
  codigo: string
  nombre: string
  sku: string
  qrDataUrl?: string
}

export const QRLabelModal: React.FC<Props> = ({ isOpen, loteId, onClose }) => {
  const [etiqueta, setEtiqueta] = useState<EtiquetaData | null>(null)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (isOpen && loteId) {
      cargarEtiqueta()
    }
  }, [isOpen, loteId])
  
  const cargarEtiqueta = async () => {
    const data = await window.colorManager.obtenerEtiquetaQR(loteId)
    if (data.success) {
      setEtiqueta(data.data)
    } else {
      setError(data.error)
    }
  }
  
  const imprimir = async () => {
    setImprimiendo(true)
    setError(null)
    
    const result = await window.colorManager.imprimirEtiquetaQR(loteId)
    
    setImprimiendo(false)
    
    if (result.success) {
      onClose()
    } else {
      setError(result.error)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">🏷️ Etiqueta QR</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {etiqueta && (
          <div className="border-2 border-dashed border-gray-300 p-4 mb-4 bg-white">
            {/* Preview de Etiqueta 40x30mm */}
            <div className="w-[200px] h-[150px] mx-auto flex flex-col items-center justify-center border border-gray-400 bg-white p-2">
              {etiqueta.qrDataUrl && (
                <img 
                  src={etiqueta.qrDataUrl} 
                  alt="QR Code" 
                  className="w-24 h-24"
                />
              )}
              <p className="text-lg font-bold font-mono mt-2">{etiqueta.codigo}</p>
              <p className="text-xs text-gray-500 truncate w-full text-center">
                {etiqueta.nombre}
              </p>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              Tamaño real: 40×30mm
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={imprimir}
            disabled={imprimiendo || !etiqueta}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {imprimiendo ? '⏳ Imprimiendo...' : '🖨️ Imprimir'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### Modificación a InventoryView.tsx

Agregar columna de acciones en la sub-tabla de lotes:

```tsx
// En la sub-tabla de lotes, agregar columna "Etiqueta"
<th className="p-2 text-center font-semibold text-gray-600">Etiqueta</th>

// En cada fila de lote:
<td className="p-2 text-center">
  <button
    onClick={() => abrirModalQR(lote.id)}
    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
  >
    🏷️ QR
  </button>
</td>
```

### 5.4 Handlers IPC (preload)

**Agregar a** `src/main/preload.ts`:

```typescript
// Etiquetas QR
obtenerEtiquetaQR: (loteId: string) => ipcRenderer.invoke('qr:obtener-etiqueta', loteId),
imprimirEtiquetaQR: (loteId: string) => ipcRenderer.invoke('qr:imprimir', loteId),
imprimirTodasEtiquetas: () => ipcRenderer.invoke('qr:imprimir-todas'),
```

**Agregar a** `src/main/main.ts`:

```typescript
import * as qrLabelService from './services/qrLabelService'

ipcMain.handle('qr:obtener-etiqueta', async (_, loteId: string) => {
  try {
    const data = await qrLabelService.getLabelData(loteId)
    const qrDataUrl = data ? await qrLabelService.generateQRDataURL(data.codigo) : null
    return { success: true, data: { ...data, qrDataUrl } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('qr:imprimir', async (_, loteId: string) => {
  try {
    const data = await qrLabelService.getLabelData(loteId)
    if (!data) return { success: false, error: 'Lote no encontrado' }
    return await qrLabelService.printToNiimbot(data)
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('qr:imprimir-todas', async () => {
  try {
    return await qrLabelService.printAllLabels()
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
```

### 5.5 Formato de Etiqueta Física

```
┌─────────────────────────────┐
│                             │
│      ┌─────────────┐        │
│      │             │        │
│      │   [QR CODE] │        │  40mm altura
│      │             │        │
│      └─────────────┘        │
│                             │
│      KT-1400-01             │
│                             │
└─────────────────────────────┘
          30mm ancho

Especificaciones:
- Tamaño: 40×30mm (estándar Niimbot B1)
- QR: 20×20mm centrado
- Texto: Font monospace, 10pt, negrita
- Margen: 2mm en todos los lados
```

---

## 6. Plan de Implementación

### 6.1 Tareas

| # | Tarea | Estimación | Dependencia |
|---|-------|------------|-------------|
| 1 | Migración Prisma: agregar campos a Lote | 30min | - |
| 2 | Crear `qrLabelService.ts` con generación QR | 1h | 1 |
| 3 | Crear componente `QRLabelModal.tsx` | 1h | - |
| 4 | Modificar `InventoryView.tsx` para mostrar botón QR en lotes | 45min | 3 |
| 5 | Agregar handlers IPC (preload + main) | 30min | 2 |
| 6 | Implementar impresión a Niimbot (USB/driver sistema) | 2h | 2, 5 |
| 7 | Agregar botón "Imprimir Todas" en header de Inventario | 30min | 4, 6 |
| 8 | Testing manual con impresora física | 1h | 6 |

**Total estimado: 7 horas 15 minutos**

### 6.2 Dependencias NPM a Instalar

```bash
pnpm add qrcode
pnpm add -D @types/qrcode
```

**Nota:** `node-hid` ya está en `optionalDependencies`, puede usarse para comunicación USB directa si se necesita.

### 6.3 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Driver Niimbot no compatible en Linux | Alta | Medio | Usar impresora genérica o ESC/POS; testing solo en Windows |
| Protocolo propietario Niimbot cambia | Baja | Alto | Mantener fallback a impresora del sistema |
| QR ilegible por baja calidad de impresión | Media | Alto | Ajustar error correction a 'H' (high) |
| Conflicto con sistema de etiquetas actual | Baja | Bajo | El sistema actual usa barcode, este usa QR - coexisten |

---

## 7. Criterios de Aceptación

- [ ] **CA-01:** Al expandir un lote en Inventario, aparece botón "🏷️ QR"
- [ ] **CA-02:** El modal muestra preview del QR con el código `SKU-##`
- [ ] **CA-03:** Al imprimir, la etiqueta sale de la Niimbot B1 con QR legible
- [ ] **CA-04:** El QR escaneado con celular muestra exactamente el código (ej: `KT-1400-01`)
- [ ] **CA-05:** Botón "Imprimir Todas" genera etiquetas para todos los lotes activos sin etiqueta
- [ ] **CA-06:** El campo `etiquetaImpresa` se actualiza a `true` tras impresión exitosa
- [ ] **CA-07:** Los nuevos lotes creados por ajuste de stock obtienen código automático

---

## 8. Testing

### 8.1 Tests Unitarios

- [ ] `qrLabelService.generateQRCode()` genera Buffer PNG válido
- [ ] `qrLabelService.generarCodigoEtiqueta()` incrementa secuencial correctamente
- [ ] `qrLabelService.getLabelData()` retorna estructura correcta

### 8.2 Tests E2E

- [ ] Flujo completo: Expandir lote → Click QR → Preview → Imprimir
- [ ] Flujo batch: Click "Imprimir Todas" → Progreso → Todas impresas

### 8.3 Test Manual con Hardware

- [ ] Conectar Niimbot B1 por USB
- [ ] Imprimir etiqueta de prueba
- [ ] Escanear QR con celular y verificar código
- [ ] Verificar que el texto es legible a simple vista

---

## 9. Rollout

### 9.1 Fase 1: MVP (Esta Implementación)
- Generación de QR funcional
- Impresión individual
- Preview en UI

### 9.2 Fase 2: Mejoras (Futuro)
- [ ] Soporte Bluetooth para Niimbot
- [ ] Plantillas de etiqueta personalizables
- [ ] Historial de etiquetas impresas
- [ ] Integración con escáner durante mezclado

---

## 10. Consideraciones de Integración con Auditor de Mezclas

### Validación Actual vs Futura

**Actual (SPEC vigente):**
- El auditor valida SKU base (`KT-1400`)
- Ignora el sufijo diferenciador (`-01`, `-02`)

**Futuro (cuando se implemente escáner):**
1. Operador escanea QR del bote
2. Sistema obtiene `KT-1400-01`
3. Valida que:
   - El SKU base coincida con el ingrediente de la receta
   - El lote sea el más antiguo disponible (FIFO)
4. Si el lote NO es el más antiguo, muestra advertencia pero permite continuar

```typescript
// Pseudocódigo de validación futura
function validarLoteEscaneado(codigoQR: string, ingredienteRequerido: string): ValidationResult {
  const [sku, secuencial] = parseCodigoEtiqueta(codigoQR) // "KT-1400", "01"
  
  // Validar SKU
  if (sku !== ingredienteRequerido) {
    return { valid: false, error: 'Ingrediente incorrecto' }
  }
  
  // Validar FIFO (advertencia, no bloqueo)
  const loteEscaneado = await getLoteByCodigo(codigoQR)
  const loteAntiguo = await getLoteMasAntiguo(sku)
  
  if (loteEscaneado.id !== loteAntiguo.id) {
    return { 
      valid: true, 
      warning: 'Este no es el lote más antiguo. ¿Continuar?' 
    }
  }
  
  return { valid: true }
}
```

---

## 11. Referencias

- [SPEC-FIFO-LOTES](../SPEC-FIFO-LOTES.md) - Sistema de lotes FIFO
- [InventoryView.tsx](../../src/renderer/components/InventoryView.tsx) - Vista actual de inventario
- [LabelTemplate.tsx](../../src/renderer/components/ui/LabelTemplate.tsx) - Sistema de etiquetas actual (barcode)
- [inventoryService.ts](../../src/main/database/inventoryService.ts) - Servicio de inventario
- [Niimbot B1 Specs](https://www.niimbot.com/product/b1) - Documentación oficial
- [qrcode npm](https://www.npmjs.com/package/qrcode) - Librería de generación QR

---

*SPEC generado bajo Metodología INTEGRA v2.5.0*

**Marca de Agua:**
```
/**
 * @spec ARCH-20260204-01
 * @document context/specs/SPEC-ETIQUETAS-QR.md
 */
```
