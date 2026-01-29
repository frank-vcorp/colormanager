/**
 * Servicio de Importación (CSV, XLS, XLSX) desde SICAR
 * Lee archivos CSV, XLS y XLSX y sincroniza inventario con BD
 *
 * ID Intervención: IMPL-20260127-10
 * Referencia: context/specs/SPEC-IMPORTADOR-SICAR.md
 * @updated IMPL-20260129-02: Agregar creación de Lotes con FIFO en importación
 */

import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { parse } from "csv-parse"
import * as xlsx from "xlsx"
import { getPrismaClient } from "../database/db"
import { ImportacionResultado } from "../../shared/types"
import { consumirStockFIFO } from "../database/inventoryService"
// FIX REFERENCE: FIX-20260127-04

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
  const existKey = headers.find((h) =>
    [
      "existencia",
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
 */
function readExcel(filePath: string): SicarRow[] {
  const workbook = xlsx.readFile(filePath)

  // Usar la primera hoja
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error("El archivo Excel no tiene hojas")
  }

  const sheet = workbook.Sheets[sheetName]

  // Convertir a JSON preservando los headers originales
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" }) as any[]

  if (rows.length === 0) {
    return []
  }

  // Normalizar los headers de la primera fila para validar
  const firstRow = rows[0]
  const headers = Object.keys(firstRow)
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
          const nuevoStock = parseFloat(String(row.Existencia || 0))
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
                `[ImportService] Ingreso detectado para ${row.Clave}: +${diferencia}g, Lote creado`
              )
            } else if (diferencia < 0) {
              // Salida: Consumir FIFO usando transacción local
              const cantidadAConsumir = Math.abs(diferencia)
              await consumirStockFIFO(existente.id, cantidadAConsumir, tx)

              console.log(
                `[ImportService] Salida detectada para ${row.Clave}: -${cantidadAConsumir}g, FIFO consumido`
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
              `[ImportService] Producto creado: ${row.Clave} con Lote Inicial (${nuevoStock}g)`
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
