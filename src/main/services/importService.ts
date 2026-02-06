/**
 * Servicio de Importación (CSV, XLS, XLSX) desde SICAR
 * Lee archivos CSV, XLS y XLSX y sincroniza inventario con BD
 *
 * ID Intervención: IMPL-20260127-10
 * Referencia: context/specs/SPEC-IMPORTADOR-SICAR.md
 * @updated IMPL-20260129-02: Agregar creación de Lotes con FIFO en importación
 * @updated FIX-20260204-20: Conversión de botes SICAR a ml usando sufijo de presentación
 */

import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { parse } from "csv-parse"
import * as xlsx from "xlsx"
import { getPrismaClient } from "../database/db"
import { ImportacionResultado } from "../../shared/types"
import { consumirStockFIFO, getNextLotNumber } from "../database/inventoryService"
// FIX REFERENCE: FIX-20260127-04

// ... (existing code)

if (diferencia > 0) {
  // Ingreso: Crear Lote con el delta y número secuencial
  const numeroLote = await getNextLotNumber(existente.id, tx)

  await tx.lote.create({
    data: {
      id: randomUUID(),
      ingredienteId: existente.id,
      numeroLote,
      cantidad: diferencia,
      estado: "activo",
    },
  })
  console.log(
    `[ImportService] Ingreso detectado para ${row.Clave}: +${diferencia}ml, Lote creado: ${numeroLote}`
  )
} else if (diferencia < 0) {
  // ...
} else {
  // CREACIÓN: Crear ingrediente con Lote Inicial 001
  const nuevoIngredienteId = `ING-${row.Clave}-${Date.now()}`

  await tx.ingrediente.create({
    data: {
      id: nuevoIngredienteId,
      codigo: row.Clave,
      // ... rest of fields
      nombre: row.Descripcion,
      descripcion: `Importado de SICAR: ${row.Descripcion}`,
      densidad: 1.0,
      costo: costo,
      stockActual: nuevoStock,
      stockMinimo: 100,
    },
  })

  // Crear Lote Inicial 001
  await tx.lote.create({
    data: {
      id: randomUUID(),
      ingredienteId: nuevoIngredienteId,
      numeroLote: "001",
      cantidad: nuevoStock,
      estado: nuevoStock > 0 ? "activo" : "agotado",
    },
  })

  console.log(
    `[ImportService] Producto creado: ${row.Clave} con Lote Inicial 001 (${nuevoStock}ml)`
  )
  resultado.creados++
}

/**
 * FIX-20260204-20: Mapeo de sufijos SICAR a capacidad en mililitros
 * SICAR usa códigos con sufijo para indicar presentación:
 * - .10 = 250ml
 * - .20 = 500ml
 * - .30 = 1L (1000ml)
 * - .40 = 4L (4000ml)
 * - .50 = 19L (19000ml)
 * 
 * El stock de SICAR viene en "botes" (unidades), NO en volumen.
 * Debemos multiplicar: stock_botes × capacidad_ml = stock_total_ml
 */
const SICAR_PRESENTATION_ML: Record<string, number> = {
  "10": 250,
  "20": 500,
  "30": 1000,
  "40": 4000,
  "50": 19000,
}

/**
 * FIX-20260204-20: Extrae información de presentación de un código SICAR
 * Ejemplo: "KP-0200.40" → { baseSku: "KP-0200", suffix: "40", capacityMl: 4000 }
 * 
 * @param clave Código SICAR (ej: "KP-0200.40")
 * @returns Objeto con SKU base, sufijo y capacidad en ml (o null si no tiene sufijo)
 */
function parseSicarPresentation(clave: string): {
  baseSku: string
  suffix: string
  capacityMl: number
} | null {
  // Buscar el patrón: cualquier código terminando en .XX (dos dígitos)
  const match = clave.match(/^(.+)\.(\d{2})$/)

  if (!match) {
    // No tiene sufijo de presentación
    return null
  }

  const [, baseSku, suffix] = match
  const capacityMl = SICAR_PRESENTATION_ML[suffix]

  if (!capacityMl) {
    // Sufijo desconocido, retornar null para tratarlo como valor directo
    console.warn(`[ImportService] Sufijo de presentación desconocido: .${suffix} en ${clave}`)
    return null
  }

  return { baseSku, suffix, capacityMl }
}

/**
 * Interfaz para una fila del SICAR (normalizada)
 */
interface SicarRow {
  Clave: string
  Descripcion: string
  Existencia: string | number
  Costo?: string | number
  [key: string]: any
}

/**
 * Interfaz para mapeo flexible de campos
 */
interface FieldMap {
  clave: string
  descripcion: string
  existencia: string
}

/**
 * Detecta la extensión del archivo y retorna en minúsculas
 */
function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().substring(1)
}

/**
 * Normaliza los nombres de campos (headers) de SICAR
 * SICAR puede usar 'Clave' o 'clave', 'Descripcion' o 'descripcion', etc.
 * Retorna un mapeo de los campos encontrados
 */
function normalizeHeaders(headers: string[]): FieldMap | null {
  // Buscar campo de clave (Clave, clave, SKU, sku, etc.)
  const claveKey = headers.find((h) =>
    ["clave", "sku", "codigo", "code"].includes(h.toLowerCase().trim())
  )

  // Buscar campo de descripción (Descripcion, descripcion, nombre, name, etc.)
  const descKey = headers.find((h) =>
    [
      "descripcion",
      "descripción",
      "nombre",
      "name",
      "producto",
      "product",
    ].includes(h.toLowerCase().trim())
  )

  // Buscar campo de existencia (Existencia, existencia, stock, cantidad, etc.)
  // FIX-20260204-17: Agregar 'exis' para formato de Sayer
  const existKey = headers.find((h) =>
    [
      "existencia",
      "exis",
      "stock",
      "cantidad",
      "quantity",
      "disponible",
      "available",
    ].includes(h.toLowerCase().trim())
  )

  if (!claveKey || !descKey || !existKey) {
    return null
  }

  return {
    clave: claveKey,
    descripcion: descKey,
    existencia: existKey,
  }
}

/**
 * Lee un archivo CSV con headers mapeados automáticamente
 */
async function readCSVWithHeaders(filePath: string): Promise<SicarRow[]> {
  return new Promise((resolve, reject) => {
    const rows: SicarRow[] = []
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" })

    const parser = parse({
      delimiter: ",",
      skip_empty_lines: true,
      trim: true,
      columns: true, // Mapea automáticamente headers
    })

    let fieldMap: FieldMap | null = null
    let isFirstRow = true

    parser.on("data", (record: any) => {
      // Normalizar headers en la primera fila
      if (isFirstRow) {
        const headers = Object.keys(record)
        fieldMap = normalizeHeaders(headers)
        if (!fieldMap) {
          stream.destroy()
          reject(
            new Error(
              "No se encontraron columnas requeridas (Clave, Descripcion, Existencia)"
            )
          )
          return
        }
        isFirstRow = false
      }

      if (fieldMap && record[fieldMap.clave]) {
        const normalizedRow: SicarRow = {
          Clave: String(record[fieldMap.clave] || "").trim(),
          Descripcion: String(record[fieldMap.descripcion] || "").trim(),
          Existencia: record[fieldMap.existencia],
          Costo: record["Costo"] || record["costo"] || undefined,
        }
        rows.push(normalizedRow)
      }
    })

    parser.on("end", () => {
      resolve(rows)
    })

    parser.on("error", (err) => {
      reject(err)
    })

    stream.on("error", (err) => {
      reject(err)
    })

    stream.pipe(parser)
  })
}

/**
 * Lee un archivo Excel (.xls o .xlsx) y retorna las filas como array de objetos
 * FIX-20260204-17: Soporta archivos con filas de encabezado (metadata) antes de los datos
 */
function readExcel(filePath: string): SicarRow[] {
  const workbook = xlsx.readFile(filePath)

  // Usar la primera hoja
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error("El archivo Excel no tiene hojas")
  }

  const sheet = workbook.Sheets[sheetName]

  // Convertir a array de arrays para detectar fila de encabezados
  const allRows = xlsx.utils.sheet_to_json(sheet, {
    header: 1, // Array de arrays, no objetos
    defval: ""
  }) as any[][]

  if (allRows.length === 0) {
    return []
  }

  // FIX-20260204-17: Buscar la fila que contiene los encabezados reales
  // (Clave, Descripcion, etc.) - puede no ser la primera fila
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i]
    if (!row) continue

    // Verificar si esta fila tiene los headers esperados
    const rowLower = row.map((cell: any) => String(cell || "").toLowerCase().trim())
    const hasClaveColumn = rowLower.some(h => ["clave", "sku", "codigo"].includes(h))
    const hasDescColumn = rowLower.some(h => ["descripcion", "descripción", "nombre"].includes(h))

    if (hasClaveColumn && hasDescColumn) {
      headerRowIndex = i
      console.log(`[ImportService] Encabezados encontrados en fila ${i + 1}`)
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "No se encontraron columnas requeridas (Clave, Descripcion) en las primeras 10 filas del archivo"
    )
  }

  // Extraer headers y datos
  const headerRow = allRows[headerRowIndex]
  const dataRows = allRows.slice(headerRowIndex + 1)

  // Crear objetos con los headers
  const rows = dataRows
    .filter(row => row && row.some((cell: any) => cell !== "" && cell !== null))
    .map(row => {
      const obj: any = {}
      headerRow.forEach((header: any, idx: number) => {
        obj[String(header || `col${idx}`).trim()] = row[idx]
      })
      return obj
    })

  if (rows.length === 0) {
    return []
  }

  // Normalizar los headers para validar
  const headers = Object.keys(rows[0])
  const fieldMap = normalizeHeaders(headers)

  if (!fieldMap) {
    throw new Error(
      "No se encontraron columnas requeridas (Clave, Descripcion, Existencia) en el archivo Excel"
    )
  }

  // Mapear los datos usando el fieldMap normalizado
  const normalizedRows: SicarRow[] = rows.map((row) => ({
    Clave: String(row[fieldMap.clave] || "").trim(),
    Descripcion: String(row[fieldMap.descripcion] || "").trim(),
    Existencia: row[fieldMap.existencia],
    Costo: row["Costo"] || row["costo"] || row["COSTO"] || undefined,
  }))

  return normalizedRows
}

/**
 * Procesa las filas de datos (común para CSV y Excel)
 * 
 * Lógica FIFO (IMPL-20260129-02):
 * 1. Si nuevo stock > stock actual: Crear Lote con delta = (nuevo - actual)
 * 2. Si nuevo stock < stock actual: Consumir FIFO (actual - nuevo)
 * 3. Si se crea producto: Crear Lote con todo el stock
 * 
 * FIX-20260204-20: Conversión de unidades SICAR (botes) a ml
 * - SICAR exporta stock en "botes" (unidades), NO en volumen
 * - El sufijo del código indica la presentación (ej: .40 = 4L)
 * - Cálculo: stock_botes × capacidad_ml = stock_total_ml
 */
async function processRows(rows: SicarRow[]): Promise<ImportacionResultado> {
  const prisma = getPrismaClient()
  const resultado: ImportacionResultado = {
    procesados: 0,
    actualizados: 0,
    creados: 0,
    errores: [],
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      for (const row of rows) {
        // Validar datos mínimos
        if (!row.Clave || !row.Descripcion) {
          resultado.errores.push(`Fila inválida: Clave o Descripcion vacíos`)
          continue
        }

        try {
          // FIX-20260204-20: Convertir stock de botes a ml usando sufijo de presentación
          const stockBotes = parseFloat(String(row.Existencia || 0))
          const presentation = parseSicarPresentation(row.Clave)

          let nuevoStock: number
          let unidadLog: string

          if (presentation) {
            // Código con sufijo de presentación: multiplicar botes × capacidad
            nuevoStock = stockBotes * presentation.capacityMl
            unidadLog = `${stockBotes} botes × ${presentation.capacityMl}ml = ${nuevoStock}ml`
            console.log(
              `[ImportService] ${row.Clave}: Presentación .${presentation.suffix} (${presentation.capacityMl}ml) → ${unidadLog}`
            )
          } else {
            // Sin sufijo reconocido: asumir que el valor ya está en ml/g
            nuevoStock = stockBotes
            unidadLog = `${nuevoStock}ml (sin conversión)`
            console.log(
              `[ImportService] ${row.Clave}: Sin sufijo de presentación, usando valor directo → ${unidadLog}`
            )
          }

          const costo = row.Costo ? parseFloat(String(row.Costo)) : 0
          const hoy = new Date().toISOString().split('T')[0] // YYYYMMDD format

          // Intentar actualizar primero
          const existente = await tx.ingrediente.findUnique({
            where: { codigo: row.Clave },
          })

          if (existente) {
            // ACTUALIZACIÓN: Manejar diferencia de stock
            const stockActual = existente.stockActual
            const diferencia = nuevoStock - stockActual

            if (diferencia > 0) {
              // Ingreso: Crear Lote con el delta
              await tx.lote.create({
                data: {
                  id: randomUUID(),
                  ingredienteId: existente.id,
                  numeroLote: `SICAR-IMPORT-${hoy}-${row.Clave}`,
                  cantidad: diferencia,
                  estado: "activo",
                },
              })
              console.log(
                `[ImportService] Ingreso detectado para ${row.Clave}: +${diferencia}ml, Lote creado`
              )
            } else if (diferencia < 0) {
              // Salida: Consumir FIFO usando transacción local
              const cantidadAConsumir = Math.abs(diferencia)
              await consumirStockFIFO(existente.id, cantidadAConsumir, tx)

              console.log(
                `[ImportService] Salida detectada para ${row.Clave}: -${cantidadAConsumir}ml, FIFO consumido`
              )
            }

            // Actualizar el ingrediente
            await tx.ingrediente.update({
              where: { codigo: row.Clave },
              data: {
                nombre: row.Descripcion,
                stockActual: nuevoStock,
                costo: costo,
                updatedAt: new Date(),
              },
            })
            resultado.actualizados++
          } else {
            // CREACIÓN: Crear ingrediente con Lote Inicial
            const nuevoIngredienteId = `ING-${row.Clave}-${Date.now()}`

            await tx.ingrediente.create({
              data: {
                id: nuevoIngredienteId,
                codigo: row.Clave,
                nombre: row.Descripcion,
                descripcion: `Importado de SICAR: ${row.Descripcion}`,
                densidad: 1.0,
                costo: costo,
                stockActual: nuevoStock,
                stockMinimo: 100,
              },
            })

            // Crear Lote Inicial con todo el stock (IMPL-20260129-02)
            await tx.lote.create({
              data: {
                id: randomUUID(),
                ingredienteId: nuevoIngredienteId,
                numeroLote: `SICAR-IMPORT-${hoy}-${row.Clave}`,
                cantidad: nuevoStock,
                estado: nuevoStock > 0 ? "activo" : "agotado",
              },
            })

            console.log(
              `[ImportService] Producto creado: ${row.Clave} con Lote Inicial (${nuevoStock}ml)`
            )
            resultado.creados++
          }
          resultado.procesados++
        } catch (rowError) {
          resultado.errores.push(
            `Error procesando ${row.Clave}: ${String(rowError)}`
          )
        }
      }
    })

    console.log(
      `[ImportService] Importación completada: ${resultado.procesados} procesados, ` +
      `${resultado.actualizados} actualizados, ${resultado.creados} creados, ` +
      `${resultado.errores.length} errores`
    )
  } catch (txError) {
    resultado.errores.push(`Error en transacción: ${String(txError)}`)
  }

  return resultado
}

/**
 * Importa un archivo de SICAR (CSV, XLS o XLSX) y actualiza el inventario
 * Detecta automáticamente el formato y procesa en consecuencia
 * Realiza upserts (actualiza si existe, crea si no existe)
 *
 * @param filePath Ruta absoluta al archivo (CSV, XLS o XLSX)
 * @returns Resultado de la importación (procesados, actualizados, creados, errores)
 */
export async function importarSicar(
  filePath: string
): Promise<ImportacionResultado> {
  const resultado: ImportacionResultado = {
    procesados: 0,
    actualizados: 0,
    creados: 0,
    errores: [],
  }

  // Verificar que el archivo existe
  if (!fs.existsSync(filePath)) {
    resultado.errores.push(`Archivo no encontrado: ${filePath}`)
    return resultado
  }

  try {
    const extension = getFileExtension(filePath)
    let rows: SicarRow[] = []

    if (extension === "csv") {
      // Procesar CSV con csv-parse
      rows = await readCSVWithHeaders(filePath)
    } else if (extension === "xlsx" || extension === "xls") {
      // Procesar Excel con xlsx
      rows = readExcel(filePath)
    } else {
      resultado.errores.push(`Extensión de archivo no soportada: .${extension}`)
      return resultado
    }

    if (rows.length === 0) {
      resultado.errores.push("El archivo no contiene datos válidos")
      return resultado
    }

    // Procesar las filas comunes a ambos formatos
    const processResult = await processRows(rows)
    return processResult
  } catch (error) {
    resultado.errores.push(`Error procesando archivo: ${String(error)}`)
    return resultado
  }
}

/**
 * Alias para mantener compatibilidad con código anterior
 * @deprecated Usar importarSicar en su lugar
 */
export async function importarCSVSicar(
  filePath: string
): Promise<ImportacionResultado> {
  return importarSicar(filePath)
}

export default {
  importarSicar,
  importarCSVSicar,
}
