/**
 * SayerParser: Utilidad para convertir texto de impresión de Sayer en objetos Receta
 * Identifica códigos de color, capas e ingredientes.
 * 
 * ID Intervención: ARCH-20260130-03
 */

import { RecetaSayer } from "../../shared/types"

export class SayerParser {
    /**
     * Parsea el contenido del texto según la estructura de Sayer
     */
    public static parse(content: string): RecetaSayer | null {
        const lines = content.split("\n").map((line) => line.trimEnd())

        // Extraer número de receta
        const numeroMatch = content.match(/Número\s*:\s*(\w+)/i)
        const numero = numeroMatch?.[1] || "000"

        // Extraer historia
        const historiaMatch = content.match(/HISTORIA\s*:\s*(\w+)/i)
        const historia = historiaMatch?.[1] || "F"

        // Extraer metadatos
        const carMakerMatch = content.match(/Car Maker\s*:\s*(.+?)(?:\n|$)/i)
        const colorCodeMatch = content.match(/Color Code\s*:\s*(.+?)(?:\n|$)/i)
        const sayerCodeMatch = content.match(/Sayer Code\s*:\s*(.+?)(?:\n|$)/i)
        const coatingTypeMatch = content.match(/Coating Type\s*:\s*(.+?)(?:\n|$)/i)
        const primerMatch = content.match(/Primer\s*:\s*(.+?)(?:\n|$)/i)

        const meta = {
            carMaker: carMakerMatch?.[1]?.trim(),
            colorCode: colorCodeMatch?.[1]?.trim(),
            sayerCode: sayerCodeMatch?.[1]?.trim(),
            coatingType: coatingTypeMatch?.[1]?.trim(),
            primer: primerMatch?.[1]?.trim(),
        }

        // Parsear capas
        const capas = this.parseCapas(lines)

        if (capas.length === 0) {
            return null
        }

        return {
            numero,
            historia,
            capas,
            meta,
        }
    }

    /**
     * Parsea las secciones de capas y sus ingredientes
     */
    private static parseCapas(lines: string[]): RecetaSayer["capas"] {
        const capas: RecetaSayer["capas"] = []
        let currentCapa: (typeof capas)[0] | null = null
        let readingIngredients = false

        // RegEx Robusta (Soporta minúsculas, comas decimales y variaciones de unidades)
        const ingredientRegex = /^\s*(\d+)\s*:\s*([A-Za-z0-9_-]+)\s+(\d+[.,]?\d*)\s*(?:\(g(?:r)?\)|g(?:r)?)?/i

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Detectar inicio de capa
            if (line.match(/Primera capa|Segunda capa|Tercera capa/i)) {
                if (currentCapa) {
                    capas.push(currentCapa)
                }
                currentCapa = {
                    nombre: line.trim(),
                    ingredientes: [],
                }
                readingIngredients = true
                continue
            }

            // Detectar fin de lectura de ingredientes (línea de Total)
            if (line.match(/^\s*Total\s+/i)) {
                readingIngredients = false
            }

            // Parsear ingredientes
            if (readingIngredients && currentCapa) {
                const match = line.match(ingredientRegex)
                if (match) {
                    const [, orden, sku, peso] = match
                    currentCapa.ingredientes.push({
                        orden: parseInt(orden, 10),
                        sku: sku.trim(),
                        // Normalizar coma a punto antes de parsear
                        pesoMeta: parseFloat(peso.replace(",", ".")),
                    })
                }
            }
        }

        if (currentCapa) {
            capas.push(currentCapa)
        }

        return capas
    }
}
