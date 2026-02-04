/**
 * Servicio de Generación e Impresión de Etiquetas QR
 * 
 * ID Intervención: ARCH-20260204-01
 * @updated IMPL-20260204-19: Soporte para impresora Niimbot B1 vía puerto COM
 * Ruta SPEC: context/specs/SPEC-ETIQUETAS-QR.md
 * 
 * Genera códigos QR para identificación única de lotes y permite
 * imprimirlos a impresora Niimbot B1 (USB/Bluetooth).
 * 
 * La impresora Niimbot B1 usa driver USB que crea puerto COM virtual.
 * El driver está en: context/USB-Driver-Install-1.0.3.0/
 */

import QRCode from 'qrcode'
import { BrowserWindow } from 'electron'
import { getPrismaClient } from '../database/db'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ============================================================================
// TIPOS
// ============================================================================

export interface EtiquetaData {
  codigo: string       // "KT-1400-01"
  nombre: string       // "NEGRO BRILLANTE"
  sku: string          // "KT-1400"
  loteId: string       // UUID del lote
  qrDataUrl?: string   // Data URL para preview
}

export interface PrintResult {
  success: boolean
  error?: string
  printed?: number
}

export interface NiimbotConfig {
  comPort?: string     // Puerto COM detectado (ej: "COM3")
  baudRate: number     // Velocidad (default 115200)
}

// ============================================================================
// DETECCIÓN DE IMPRESORA NIIMBOT
// ============================================================================

/**
 * Detecta el puerto COM de la impresora Niimbot B1
 * El driver USB crea un puerto serial virtual cuando se conecta
 */
export async function detectNiimbotPort(): Promise<string | null> {
  if (process.platform !== 'win32') {
    console.log('[qrLabelService] Detección COM solo disponible en Windows')
    return null
  }
  
  try {
    // Buscar puertos COM con dispositivo USB-SERIAL CH340 (driver Niimbot)
    const { stdout } = await execAsync(
      'powershell -Command "Get-WmiObject Win32_PnPEntity | Where-Object { $_.Name -match \'CH340|USB-SERIAL|Niimbot\' } | ForEach-Object { if ($_.Name -match \'COM(\\d+)\') { Write-Output $Matches[0] } }"'
    )
    
    const comPort = stdout.trim()
    if (comPort && comPort.startsWith('COM')) {
      console.log(`[qrLabelService] Niimbot detectada en ${comPort}`)
      return comPort
    }
    
    // Fallback: buscar cualquier puerto serial reciente
    const { stdout: ports } = await execAsync(
      'powershell -Command "[System.IO.Ports.SerialPort]::GetPortNames() | ForEach-Object { Write-Output $_ }"'
    )
    
    const portList = ports.trim().split('\n').filter(p => p.startsWith('COM'))
    if (portList.length > 0) {
      // Tomar el último puerto (usualmente el más reciente)
      const lastPort = portList[portList.length - 1].trim()
      console.log(`[qrLabelService] Usando puerto serial: ${lastPort}`)
      return lastPort
    }
    
  } catch (error) {
    console.error('[qrLabelService] Error detectando puerto COM:', error)
  }
  
  return null
}

// ============================================================================
// GENERACIÓN DE CÓDIGOS QR
// ============================================================================

/**
 * Genera imagen QR como Data URL para preview en UI
 */
export async function generateQRDataURL(codigo: string): Promise<string> {
  return QRCode.toDataURL(codigo, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

/**
 * Genera código de etiqueta único para un nuevo lote
 * Formato: [SKU]-[##] donde ## es secuencial por ingrediente
 */
export async function generarCodigoEtiqueta(ingredienteSKU: string): Promise<string> {
  const prisma = getPrismaClient()
  
  // Contar lotes existentes de este ingrediente que ya tienen código
  const count = await prisma.lote.count({
    where: {
      ingrediente: { codigo: ingredienteSKU },
      codigoEtiqueta: { not: null }
    }
  })
  
  const secuencial = String(count + 1).padStart(2, '0')
  return `${ingredienteSKU}-${secuencial}`
}

// ============================================================================
// OBTENER DATOS DE ETIQUETA
// ============================================================================

/**
 * Obtiene datos de etiqueta para un lote específico
 * Si el lote no tiene código de etiqueta, lo genera automáticamente
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
  
  // Generar QR Data URL para preview
  const qrDataUrl = await generateQRDataURL(codigo)
  
  return {
    codigo,
    nombre: lote.ingrediente.nombre,
    sku: lote.ingrediente.codigo,
    loteId: lote.id,
    qrDataUrl
  }
}

/**
 * Obtiene lista de todos los lotes activos pendientes de etiquetar
 */
export async function getPendingLabels(): Promise<EtiquetaData[]> {
  const prisma = getPrismaClient()
  
  const lotes = await prisma.lote.findMany({
    where: {
      estado: { in: ['activo', 'parcial'] },
      OR: [
        { codigoEtiqueta: null },
        { etiquetaImpresa: false }
      ]
    },
    include: { ingrediente: true },
    orderBy: [
      { ingrediente: { codigo: 'asc' } },
      { createdAt: 'asc' }
    ]
  })
  
  const etiquetas: EtiquetaData[] = []
  
  for (const lote of lotes) {
    let codigo = lote.codigoEtiqueta
    if (!codigo) {
      codigo = await generarCodigoEtiqueta(lote.ingrediente.codigo)
      await prisma.lote.update({
        where: { id: lote.id },
        data: { codigoEtiqueta: codigo }
      })
    }
    
    etiquetas.push({
      codigo,
      nombre: lote.ingrediente.nombre,
      sku: lote.ingrediente.codigo,
      loteId: lote.id
    })
  }
  
  return etiquetas
}

// ============================================================================
// IMPRESIÓN
// ============================================================================

/**
 * Imprime etiqueta a impresora del sistema
 * Primero intenta usar el puerto COM de Niimbot (si está disponible)
 * Si no, usa el sistema de impresión de Electron
 */
export async function printLabel(etiqueta: EtiquetaData): Promise<PrintResult> {
  try {
    // En Windows, intentar detectar Niimbot por COM
    if (process.platform === 'win32') {
      const comPort = await detectNiimbotPort()
      if (comPort) {
        return await printLabelViaCOM(etiqueta, comPort)
      }
    }
    
    // Fallback: usar impresión tradicional de Electron
    return await printLabelViaElectron(etiqueta)
    
  } catch (error) {
    console.error('[qrLabelService] Error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Imprime etiqueta vía puerto COM serial (Niimbot B1)
 * Nota: Por ahora usa la impresión de Electron con hint de impresora
 * TODO: Implementar protocolo directo Niimbot cuando se documente
 */
async function printLabelViaCOM(etiqueta: EtiquetaData, comPort: string): Promise<PrintResult> {
  try {
    // La impresora Niimbot B1 tiene protocolo propietario
    // Por ahora, usamos print via sistema buscando la impresora Niimbot
    console.log(`[qrLabelService] Niimbot detectada en ${comPort}, usando impresión de sistema`)
    
    // Fallback a impresión via Electron buscando específicamente la Niimbot
    return await printLabelViaElectron(etiqueta, 'Niimbot')
    
  } catch (error) {
    console.error('[qrLabelService] Error COM:', error)
    return { success: false, error: `Error puerto ${comPort}: ${error}` }
  }
}

/**
 * Imprime etiqueta usando sistema de impresión de Electron
 * Usa ventana oculta para renderizar e imprimir
 */
async function printLabelViaElectron(etiqueta: EtiquetaData, printerHint?: string): Promise<PrintResult> {
  try {
    const qrDataUrl = etiqueta.qrDataUrl || await generateQRDataURL(etiqueta.codigo)
    
    // Crear ventana oculta para impresión
    const printWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })
    
    // HTML de la etiqueta (40x30mm = ~150x113px a 96dpi)
    const labelHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 40mm 30mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 2mm;
            font-family: 'Courier New', monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 40mm;
            height: 30mm;
            box-sizing: border-box;
          }
          .qr {
            width: 18mm;
            height: 18mm;
          }
          .codigo {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 1mm;
            text-align: center;
          }
          .nombre {
            font-size: 6pt;
            color: #333;
            margin-top: 0.5mm;
            text-align: center;
            max-width: 36mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <img class="qr" src="${qrDataUrl}" alt="QR">
        <div class="codigo">${etiqueta.codigo}</div>
        <div class="nombre">${etiqueta.nombre}</div>
      </body>
      </html>
    `
    
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(labelHtml)}`)
    
    // Obtener lista de impresoras
    const printers = await printWindow.webContents.getPrintersAsync()
    
    // Buscar impresora según hint o usar defaults
    let targetPrinter = printers.find(p => {
      const name = p.name.toLowerCase()
      // Si hay hint, buscar por ese término
      if (printerHint) {
        return name.includes(printerHint.toLowerCase())
      }
      // Por defecto, buscar Niimbot o impresora de etiquetas
      return name.includes('niimbot') || name.includes('label') || name.includes('b1')
    })
    
    const printerName = targetPrinter?.name || undefined
    
    if (printerName) {
      console.log(`[qrLabelService] Usando impresora: ${printerName}`)
    } else {
      console.log('[qrLabelService] Usando impresora predeterminada')
    }
    
    // Imprimir
    const printResult = await new Promise<boolean>((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName,
          pageSize: { width: 40000, height: 30000 }, // micrómetros
          margins: { marginType: 'none' }
        },
        (success, failureReason) => {
          if (!success && failureReason) {
            console.error('[qrLabelService] Error de impresión:', failureReason)
          }
          resolve(success)
        }
      )
    })
    
    printWindow.close()
    
    if (printResult) {
      // Marcar como impresa
      const prisma = getPrismaClient()
      await prisma.lote.update({
        where: { id: etiqueta.loteId },
        data: { etiquetaImpresa: true }
      })
      
      return { success: true, printed: 1 }
    } else {
      return { success: false, error: 'La impresión fue cancelada o falló' }
    }
    
  } catch (error) {
    console.error('[qrLabelService] Error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Imprime todas las etiquetas pendientes
 */
export async function printAllLabels(): Promise<PrintResult> {
  const etiquetas = await getPendingLabels()
  
  if (etiquetas.length === 0) {
    return { success: true, printed: 0, error: 'No hay etiquetas pendientes' }
  }
  
  let printed = 0
  const errors: string[] = []
  
  for (const etiqueta of etiquetas) {
    // Agregar QR data URL si no lo tiene
    if (!etiqueta.qrDataUrl) {
      etiqueta.qrDataUrl = await generateQRDataURL(etiqueta.codigo)
    }
    
    const result = await printLabel(etiqueta)
    
    if (result.success) {
      printed++
    } else {
      errors.push(`${etiqueta.codigo}: ${result.error}`)
    }
    
    // Pequeña pausa entre impresiones
    await new Promise(r => setTimeout(r, 500))
  }
  
  return {
    success: errors.length === 0,
    printed,
    error: errors.length > 0 ? errors.join('; ') : undefined
  }
}

/**
 * Asigna códigos de etiqueta a todos los lotes que no lo tienen
 * Útil para migración inicial del inventario existente
 */
export async function assignLabelCodesToAll(): Promise<{ assigned: number }> {
  const prisma = getPrismaClient()
  
  const lotesWithoutCode = await prisma.lote.findMany({
    where: { codigoEtiqueta: null },
    include: { ingrediente: true },
    orderBy: [
      { ingrediente: { codigo: 'asc' } },
      { createdAt: 'asc' }
    ]
  })
  
  let assigned = 0
  
  for (const lote of lotesWithoutCode) {
    const codigo = await generarCodigoEtiqueta(lote.ingrediente.codigo)
    await prisma.lote.update({
      where: { id: lote.id },
      data: { codigoEtiqueta: codigo }
    })
    assigned++
  }
  
  return { assigned }
}

/**
 * Extrae el SKU base de un código de etiqueta
 * "KT-1400-01" → "KT-1400"
 * "KT-1400" → "KT-1400" (sin cambios)
 */
export function extractBaseSKU(codigoEtiqueta: string): string {
  // Remover sufijo -## si existe
  return codigoEtiqueta.replace(/-\d{2}$/, '')
}
