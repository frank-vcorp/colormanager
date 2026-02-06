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
 * Usa ventana visible para renderizar e imprimir
 * FIX-20260204-21: Mostrar diálogo de impresión para mejor compatibilidad
 * FIX-20260204-22: Esperar carga completa de imagen QR antes de imprimir
 * FIX-20260204-23: Escribir HTML a archivo temporal para mejor compatibilidad
 */
async function printLabelViaElectron(etiqueta: EtiquetaData, _printerHint?: string): Promise<PrintResult> {
  try {
    const qrDataUrl = etiqueta.qrDataUrl || await generateQRDataURL(etiqueta.codigo)

    // FIX-20260204-23: Escribir HTML a archivo temporal (más compatible que data: URL)
    const tempDir = require('os').tmpdir()
    const tempFile = require('path').join(tempDir, `colormanager-label-${Date.now()}.html`)

    const labelHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta ${etiqueta.codigo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A5; margin: 10mm; }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .label {
      background: white;
      padding: 25px;
      border: 3px solid #333;
      border-radius: 10px;
      text-align: center;
      max-width: 300px;
    }
    .qr-container {
      background: white;
      padding: 10px;
      border: 1px solid #ddd;
      display: inline-block;
    }
    .qr { width: 180px; height: 180px; display: block; }
    .codigo {
      font-size: 24pt;
      font-weight: bold;
      margin-top: 15px;
      font-family: 'Courier New', monospace;
    }
    .nombre {
      font-size: 14pt;
      color: #333;
      margin-top: 8px;
    }
    .sku {
      font-size: 11pt;
      color: #666;
      margin-top: 5px;
    }
    .no-print {
      margin-top: 30px;
      padding: 15px;
      background: #e8f5e9;
      border-radius: 8px;
      color: #2e7d32;
    }
    @media print {
      .no-print { display: none; }
      body { min-height: auto; padding: 0; }
      .label { border: 2px solid #000; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="qr-container">
      <img class="qr" src="${qrDataUrl}" alt="QR Code">
    </div>
    <div class="codigo">${etiqueta.codigo}</div>
    <div class="nombre">${etiqueta.nombre}</div>
    <div class="sku">SKU: ${etiqueta.sku}</div>
  </div>
  <div class="no-print">
    <strong>Vista previa de etiqueta</strong><br>
    Use Ctrl+P o el botón de imprimir del diálogo
  </div>
</body>
</html>`

    // Escribir archivo temporal
    require('fs').writeFileSync(tempFile, labelHtml, 'utf-8')
    console.log('[qrLabelService] HTML escrito a:', tempFile)

    // Crear ventana visible
    const printWindow = new BrowserWindow({
      width: 450,
      height: 550,
      show: true,
      title: `Imprimir Etiqueta: ${etiqueta.codigo}`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // Cargar desde archivo (más confiable que data: URL)
    await printWindow.loadFile(tempFile)

    // Esperar renderizado completo
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('[qrLabelService] Contenido cargado, mostrando diálogo de impresión...')

    // Mostrar diálogo de impresión
    const printResult = await new Promise<boolean>((resolve) => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
        },
        (success, failureReason) => {
          if (!success && failureReason) {
            console.error('[qrLabelService] Error:', failureReason)
          }
          resolve(success)
        }
      )
    })

    // Limpiar archivo temporal
    try {
      require('fs').unlinkSync(tempFile)
    } catch (e) {
      // Ignorar error de limpieza
    }

    // Cerrar ventana
    setTimeout(() => {
      if (!printWindow.isDestroyed()) {
        printWindow.close()
      }
    }, 500)

    if (printResult) {
      const prisma = getPrismaClient()
      await prisma.lote.update({
        where: { id: etiqueta.loteId },
        data: { etiquetaImpresa: true }
      })
      return { success: true, printed: 1 }
    } else {
      return { success: false, error: 'Impresión cancelada' }
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

// ============================================================================
// ETIQUETAS DE MEZCLA (IMPL-20260206-01)
// ============================================================================

export interface MixLabelData {
  id: string           // "MZC-123456"
  nombre: string       // "Rojo Taxi 05"
  cliente?: string     // "Juan Perez"
  vehiculo?: string    // "Tsuru 2010"
  fecha: string        // "06/02/2026"
  qrDataUrl?: string
}

/**
 * Imprime etiqueta de MEZCLA FINAL
 */
export async function printMixLabel(data: MixLabelData): Promise<PrintResult> {
  try {
    // Generar QR si no existe
    if (!data.qrDataUrl) {
      data.qrDataUrl = await generateQRDataURL(data.id)
    }

    // Por ahora, usamos siempre el método Electron (HTML -> Print)
    // Se adaptará si se requiere soporte directo Niimbot más adelante
    return await printMixLabelViaElectron(data)

  } catch (error) {
    console.error('[qrLabelService] Error printMixLabel:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Genera HTML e imprime etiqueta de mezcla
 * Diseño optimizado para Niimbot B1 (50x30mm)
 */
async function printMixLabelViaElectron(data: MixLabelData): Promise<PrintResult> {
  try {
    // FIX-20260204-23: Escribir HTML a archivo temporal
    const tempDir = require('os').tmpdir()
    const tempFile = require('path').join(tempDir, `colormanager-mix-${Date.now()}.html`)

    const labelHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mezcla ${data.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    /* Tamaño Niimbot B1 50x30mm */
    @page { size: 50mm 30mm; margin: 0; }
    body {
      font-family: Arial, sans-serif;
      width: 50mm;
      height: 30mm;
      background: white;
      /* Ajuste de márgenes seguros */
      padding: 1mm;
    }
    .container {
      display: flex;
      flex-direction: row;
      height: 100%;
      align-items: center;
      border: 1px solid white; /* Prevent collapse */
    }
    .qr-section {
      width: 18mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .qr-img {
      width: 16mm;
      height: 16mm;
      image-rendering: pixelated; /* Mejor nitidez para barcode/qr */
    }
    .id-text {
      font-size: 5pt;
      font-family: monospace;
      margin-top: 1px;
      font-weight: bold;
      text-align: center;
      width: 100%;
    }
    .info-section {
      flex: 1;
      padding-left: 2px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
      overflow: hidden;
    }
    .nombre-color {
      font-size: 8pt;
      font-weight: bold;
      line-height: 1;
      margin-bottom: 2px;
      max-height: 22px;
      overflow: hidden;
      text-transform: uppercase;
    }
    .meta-row {
      font-size: 6.5pt;
      color: #000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.1;
      font-weight: 600;
    }
    .fecha {
      font-size: 6pt;
      color: #000;
      margin-top: 2px;
      border-top: 1px solid #000;
      padding-top: 1px;
      display: block;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="qr-section">
      <img class="qr-img" src="${data.qrDataUrl}" />
      <div class="id-text">${data.id.substring(data.id.length - 6)}</div>
    </div>
    <div class="info-section">
      <div class="nombre-color">${data.nombre}</div>
      ${data.cliente ? `<div class="meta-row">👤 ${data.cliente.substring(0, 15)}</div>` : ''}
      ${data.vehiculo ? `<div class="meta-row">🚗 ${data.vehiculo.substring(0, 15)}</div>` : ''}
      <div class="fecha">${data.fecha}</div>
    </div>
  </div>
</body>
</html>`

    require('fs').writeFileSync(tempFile, labelHtml, 'utf-8')

    const printWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: false, // Oculto
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    await printWindow.loadFile(tempFile)

    // Aumentar tiempo de espera para asegurar carga de imagen QR
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Buscar impresora Niimbot
    const printers = await printWindow.webContents.getPrintersAsync()
    console.log('[qrLabelService] Impresoras disponibles:', printers.map(p => p.name))

    // Buscar impresora que contenga "Niimbot" o "B1" (case insensitive)
    const niimbotPrinter = printers.find(p =>
      p.name.toLowerCase().includes('niimbot') ||
      p.name.toLowerCase().includes('b1')
    )

    const deviceName = niimbotPrinter ? niimbotPrinter.name : ''

    if (deviceName) {
      console.log(`[qrLabelService] ✅ Usando impresora detectada: ${deviceName}`)
    } else {
      console.warn('[qrLabelService] ⚠️ No se detectó impresora Niimbot. Usando default.')
    }

    const printResult = await new Promise<boolean>((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: false,
          deviceName: deviceName, // Usar impresora específica si se encontró
          // Definir márgenes minimos si es posible
          margins: { marginType: 'none' }
        },
        (success, failureReason) => {
          if (!success) console.error('[qrLabelService] Error Impresión Mezcla:', failureReason)
          resolve(success)
        }
      )
    })

    // Cleanup
    try { require('fs').unlinkSync(tempFile) } catch (e) { }

    setTimeout(() => {
      if (!printWindow.isDestroyed()) printWindow.close()
    }, 2000) // Dar tiempo al spooler

    return { success: printResult, printed: printResult ? 1 : 0 }

  } catch (error) {
    console.error('[qrLabelService] Error printMixLabelViaElectron:', error)
    return { success: false, error: String(error) }
  }
}
