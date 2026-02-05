/**
 * SayerParser: Utilidad para convertir texto de impresión de Sayer en objetos Receta
 * Identifica códigos de color, capas e ingredientes.
 * 
 * ID Intervención: ARCH-20260130-03
 * @updated FIX-20260204-13: Soporte para formato real de Sayer (FORMULA DE COLOR)
 */

import { RecetaSayer } from "../../shared/types"

export class SayerParser {
    /**
     * Parsea el contenido del texto según la estructura de Sayer
     * FIX-20260204-13: Soporta múltiples formatos de receta
     */
    public static parse(content: string): RecetaSayer | null {
        console.log(`[SayerParser] Parseando contenido (${content.length} bytes)`)
        
        // Intentar formato SAYER - FORMULA DE COLOR primero
        let receta = this.parseFormulaDeColor(content)
        
        if (!receta) {
            // Intentar formato antiguo (Primera capa, Segunda capa...)
            receta = this.parseFormatoCapas(content)
        }
        
        if (receta) {
            console.log(`[SayerParser] ✅ Receta parseada: ${receta.numero} con ${receta.capas.length} capas`)
        } else {
            console.log(`[SayerParser] ⚠️ No se pudo parsear la receta`)
        }
        
        return receta
    }

    /**
     * Parsea formato "SAYER - FORMULA DE COLOR"
     * Formato típico:
     *   CLIENTE: XXX
     *   VEHICULO: YYY
     *   CODIGO COLOR: ZZZ
     *   NOMBRE COLOR: AAA
     *   COMPONENTES
     *   CODIGO    DESCRIPCION    CANTIDAD    UNIDAD
     *   XXX-001   Descripcion    123.45      g
     */
    private static parseFormulaDeColor(content: string): RecetaSayer | null {
        // Verificar que es formato FORMULA DE COLOR
        if (!content.includes("FORMULA DE COLOR") && !content.includes("COMPONENTES")) {
            return null
        }
        
        console.log(`[SayerParser] Detectado formato FORMULA DE COLOR`)
        
        const lines = content.split("\n").map((line) => line.trimEnd())
        
        // Extraer metadatos
        const clienteMatch = content.match(/CLIENTE[:\s]+(.+?)(?:\n|$)/i)
        const vehiculoMatch = content.match(/VEHICULO[:\s]+(.+?)(?:\n|$)/i)
        const codigoColorMatch = content.match(/CODIGO\s*COLOR[:\s]+(.+?)(?:\n|$)/i)
        const nombreColorMatch = content.match(/NOMBRE\s*COLOR[:\s]+(.+?)(?:\n|$)/i)
        const fechaMatch = content.match(/FECHA[:\s]+(.+?)(?:\n|$)/i)
        const notasMatch = content.match(/NOTAS[:\s]+(.+?)(?:\n|$)/i)
        
        // Generar número de receta basado en código de color o timestamp
        const numero = codigoColorMatch?.[1]?.trim() || `REC-${Date.now()}`
        
        const meta = {
            cliente: clienteMatch?.[1]?.trim(),
            vehiculo: vehiculoMatch?.[1]?.trim(),
            colorCode: codigoColorMatch?.[1]?.trim(),
            nombreColor: nombreColorMatch?.[1]?.trim(),
            fecha: fechaMatch?.[1]?.trim(),
            notas: notasMatch?.[1]?.trim(),
        }
        
        // Parsear componentes/ingredientes
        const ingredientes = this.parseComponentes(lines)
        
        if (ingredientes.length === 0) {
            console.log(`[SayerParser] ⚠️ No se encontraron componentes`)
            return null
        }
        
        // Crear una única capa con todos los ingredientes
        return {
            numero,
            historia: "F",
            capas: [{
                nombre: meta.nombreColor || "Formula",
                ingredientes,
            }],
            meta,
        }
    }

    /**
     * Parsea la sección de COMPONENTES
     * Busca líneas con formato: CODIGO  DESCRIPCION  CANTIDAD  UNIDAD
     */
    private static parseComponentes(lines: string[]): RecetaSayer["capas"][0]["ingredientes"] {
        const ingredientes: RecetaSayer["capas"][0]["ingredientes"] = []
        let inComponentesSection = false
        let orden = 1
        
        // Múltiples patrones para detectar ingredientes
        // Formato 1: "MOU-001    MOUSE USB    82.00    g"
        // Formato 2: "1: SKU123 45.5 (g)"
        // Formato 3: "SKU-001  82.00"
        const patterns = [
            // Patrón con código, descripción, cantidad, unidad (separados por espacios)
            /^\s*([A-Za-z0-9_-]+)\s{2,}(.+?)\s{2,}(\d+[.,]?\d*)\s+([a-zA-Z]+)?\s*$/,
            // Patrón simple: código y cantidad
            /^\s*([A-Za-z0-9_-]+)\s+(\d+[.,]?\d*)\s*(?:g|ml|kg|l)?\s*$/i,
            // Patrón con número de orden
            /^\s*(\d+)[:\s]+([A-Za-z0-9_-]+)\s+(\d+[.,]?\d*)/,
        ]
        
        for (const line of lines) {
            // Detectar inicio de sección de componentes
            if (line.match(/COMPONENTES/i)) {
                inComponentesSection = true
                continue
            }
            
            // Detectar fin de sección (TOTAL o línea de guiones larga)
            if (inComponentesSection && (line.match(/^\s*TOTAL[:\s]/i) || line.match(/^-{10,}$/))) {
                // Seguir buscando, puede haber más ingredientes después
                continue
            }
            
            // Saltar líneas de encabezado
            if (line.match(/^\s*CODIGO\s+DESCRIPCION/i)) {
                continue
            }
            
            // Saltar líneas vacías o solo guiones
            if (!line.trim() || line.match(/^[-=\s]+$/)) {
                continue
            }
            
            if (inComponentesSection) {
                // Intentar cada patrón
                for (const pattern of patterns) {
                    const match = line.match(pattern)
                    if (match) {
                        let sku: string
                        let cantidad: number
                        let descripcion: string | undefined
                        
                        if (pattern === patterns[0]) {
                            // Patrón con código, descripción, cantidad, unidad
                            sku = match[1].trim()
                            descripcion = match[2].trim()
                            cantidad = parseFloat(match[3].replace(",", "."))
                        } else if (pattern === patterns[1]) {
                            // Patrón simple
                            sku = match[1].trim()
                            cantidad = parseFloat(match[2].replace(",", "."))
                        } else {
                            // Patrón con número de orden
                            sku = match[2].trim()
                            cantidad = parseFloat(match[3].replace(",", "."))
                        }
                        
                        if (sku && !isNaN(cantidad) && cantidad > 0) {
                            ingredientes.push({
                                orden: orden++,
                                sku,
                                descripcion,
                                pesoMeta: cantidad,
                            })
                            console.log(`[SayerParser] Ingrediente encontrado: ${sku} = ${cantidad}`)
                        }
                        break
                    }
                }
            }
        }
        
        return ingredientes
    }

    /**
     * Parsea formato antiguo con "Primera capa", "Segunda capa", etc.
     */
    private static parseFormatoCapas(content: string): RecetaSayer | null {
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
        const capas = this.parseCapasAntiguo(lines)

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
     * Parsea las secciones de capas y sus ingredientes (formato antiguo)
     */
    private static parseCapasAntiguo(lines: string[]): RecetaSayer["capas"] {
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
