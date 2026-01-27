/**
 * SessionController Component
 * Orquesta el flujo de mezcla con una receta
 * Mantiene estado del ingrediente actual y facilita navegación entre ingredientes
 * Captura y guarda registro de mezcla finalizada
 * 
 * Estilo: Industrial limpio, tipografía grande (pantalla táctil/taller)
 * IMPL-20260127-06: Validación SKU para prevenir mezcla de ingrediente incorrecto
 * @see SPEC-UX-COLORMANAGER.md
 */

import { useState, useEffect, useRef } from "react"
import { RecetaSayer, IngredienteReceta, RegistroMezcla } from "@shared/types"
import { useBascula } from "../hooks/useBascula"
import { useToast } from "../hooks/useToast"
import SmartScale from "./SmartScale"
import HeaderBar from "./HeaderBar"

interface SessionControllerProps {
  receta: RecetaSayer
  onFinish: () => void
}

/**
 * Componente que controla la sesión de mezcla
 * Muestra el ingrediente actual y facilita la navegación entre ingredientes
 * IMPL-20260127-06: Valida SKU antes de permitir pesaje
 */
export default function SessionController({ receta, onFinish }: SessionControllerProps) {
  const { peso, estable } = useBascula()
  const { success, error: showError } = useToast()
  const [ingredienteActualIdx, setIngredienteActualIdx] = useState(0)
  const [basculaConectada] = useState(true)
  const [pesosRegistrados, setPesosRegistrados] = useState<number[]>([]) // Pesos por ingrediente
  const [horaInicio] = useState(new Date().toISOString())
  const [guardando, setGuardando] = useState(false)
  
  // IMPL-20260127-06: Estados de validación SKU
  const [skuVerificado, setSkuVerificado] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Obtener lista de todos los ingredientes de la receta
  const ingredientes: IngredienteReceta[] = receta.capas.flatMap((capa) =>
    capa.ingredientes.map((ing) => ({
      codigo: ing.sku,
      nombre: ing.sku, // Por ahora usamos SKU como nombre
      pesoTarget: ing.pesoMeta,
      orden: ing.orden,
    }))
  )

  const ingredienteActual = ingredientes[ingredienteActualIdx]
  const pesoTotal = ingredientes.reduce((sum, ing) => sum + ing.pesoTarget, 0)
  const pesoAcumulado = ingredientes
    .slice(0, ingredienteActualIdx)
    .reduce((sum, ing) => sum + ing.pesoTarget, 0)

  // Al montar, iniciar la mezcla
  useEffect(() => {
    if (!window.colorManager) {
      console.error("[SessionController] window.colorManager no disponible")
      return
    }

    console.log("[SessionController] Iniciando mezcla...")
    window.colorManager.iniciarMezcla("RECETA-" + receta.numero)
  }, [receta.numero])

  // IMPL-20260127-06: Al cambiar de ingrediente, resetear validación y auto-enfocar input
  useEffect(() => {
    setSkuVerificado(false)
    setInputValue("")
    // Auto-enfocar el input de escaneo
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [ingredienteActualIdx])

  // IMPL-20260127-06: Validar SKU al presionar ENTER
  const handleValidarSKU = () => {
    const inputTrimmed = inputValue.trim()
    const skuEsperado = ingredienteActual.codigo.trim()

    // Comparación case-insensitive
    if (inputTrimmed.toUpperCase() === skuEsperado.toUpperCase()) {
      setSkuVerificado(true)
      setInputValue("")
      success(`✓ SKU ${skuEsperado} validado correctamente`, 2000)
      console.log(`[SessionController] SKU validado: ${skuEsperado}`)
    } else {
      showError(
        `✗ SKU incorrecto. Esperado: ${skuEsperado}. Escaneado: ${inputTrimmed}`,
        3000
      )
      setInputValue("")
      console.warn(`[SessionController] SKU inválido. Esperado: ${skuEsperado}, Recibido: ${inputTrimmed}`)
    }
  }

  // IMPL-20260127-06: Bypass de validación para desarrollo
  const handleBypassValidacion = () => {
    setSkuVerificado(true)
    success("🔓 Validación bypassed (modo desarrollo)", 2000)
    console.warn("[SessionController] BYPASS DE VALIDACIÓN ACTIVADO")
  }

  // Ir al siguiente ingrediente (o finalizar)
  const handleSiguiente = async () => {
    // Registrar peso del ingrediente actual
    const pesoFinal = peso
    const nuevosPesos = [...pesosRegistrados, pesoFinal]
    setPesosRegistrados(nuevosPesos)

    if (ingredienteActualIdx < ingredientes.length - 1) {
      // Ir al siguiente ingrediente
      setIngredienteActualIdx(ingredienteActualIdx + 1)
      // Realizar tara para el siguiente ingrediente
      if (window.colorManager?.tara) {
        await window.colorManager.tara()
      }
    } else {
      // Fin de la mezcla: guardar registro
      console.log("[SessionController] Finalizando mezcla...")
      await guardarMezcla(nuevosPesos)
    }
  }

  // Guardar mezcla en base de datos
  const guardarMezcla = async (pesos: number[]) => {
    try {
      setGuardando(true)
      if (!window.colorManager?.guardarMezcla) {
        console.error("guardarMezcla no disponible")
        onFinish()
        return
      }

      const ahora = new Date()
      const pesoFinal = pesos.reduce((a, b) => a + b, 0)
      const tolerancia = 0.5 // gramos
      const diferencia = pesoFinal - pesoTotal
      const estado = Math.abs(diferencia) <= tolerancia ? "perfecto" : "desviado"

      const registro: RegistroMezcla = {
        id: `MZC-${Date.now()}`,
        recetaId: `RECETA-${receta.numero}`,
        recetaNombre: `Receta ${receta.numero}`,
        fecha: ahora.toISOString(),
        horaInicio,
        horaFin: ahora.toISOString(),
        pesoTotal,
        pesoFinal,
        ingredientes: ingredientes.map((ing, idx) => ({
          codigo: ing.codigo,
          pesoTarget: ing.pesoTarget,
          pesoPesado: pesos[idx] || 0,
        })),
        estado,
        diferencia,
        tolerancia,
      }

      await window.colorManager.guardarMezcla(registro)
      console.log("[SessionController] Mezcla guardada exitosamente:", registro)
      success("✓ Mezcla guardada correctamente", 3000)
      onFinish()
    } catch (error) {
      console.error("[SessionController] Error guardando mezcla:", error)
      const mensaje = error instanceof Error ? error.message : "Error desconocido"
      showError(`Error al guardar mezcla: ${mensaje}`, 4000)
      onFinish()
    } finally {
      setGuardando(false)
    }
  }

  // Verificar si el peso actual está en rango
  const tolerancia = 0.5
  const minTarget = ingredienteActual.pesoTarget - tolerancia
  const maxTarget = ingredienteActual.pesoTarget + tolerancia
  const enRango = peso >= minTarget && peso <= maxTarget

  return (
    <div className="min-h-screen bg-cm-bg flex flex-col">
      {/* Header */}
      <HeaderBar basculaConectada={basculaConectada} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {/* Progreso de Mezcla */}
        <div className="w-full max-w-2xl bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-blue-700">PROGRESO DE MEZCLA</p>
            <p className="text-sm font-bold text-blue-800">
              Ingrediente {ingredienteActualIdx + 1} de {ingredientes.length}
            </p>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{
                width: `${((ingredienteActualIdx + 1) / ingredientes.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* IMPL-20260127-06: Panel de Validación SKU (mostrar si NO está verificado) */}
        {!skuVerificado ? (
          <div className="w-full max-w-2xl bg-yellow-50 border-4 border-yellow-400 rounded-lg p-8 shadow-lg">
            {/* Icono de candado */}
            <div className="text-center mb-4">
              <p className="text-6xl">🔒</p>
              <p className="text-xl font-bold text-yellow-800 mt-2">VALIDACIÓN REQUERIDA</p>
            </div>

            {/* Nombre del ingrediente esperado */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 font-semibold uppercase mb-2">
                Escanea el código correcto:
              </p>
              <h2 className="text-6xl font-black text-gray-900 mb-2">
                {ingredienteActual.codigo}
              </h2>
            </div>

            {/* Input de escaneo */}
            <div className="mb-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleValidarSKU()
                  }
                }}
                placeholder={`Escanea el código ${ingredienteActual.codigo}...`}
                className="w-full px-6 py-4 text-center text-3xl font-bold border-2 border-yellow-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600 bg-white"
                autoFocus
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleValidarSKU}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors"
              >
                ✓ Validar
              </button>

              {/* IMPL-20260127-06: Botón Bypass discreto */}
              <button
                onClick={handleBypassValidacion}
                title="Modo desarrollo: salta validación"
                className="px-3 py-3 bg-gray-400 hover:bg-gray-500 text-gray-700 text-xs rounded font-semibold transition-colors opacity-60 hover:opacity-100"
              >
                🔓 Bypass
              </button>
            </div>

            {/* Recordatorio */}
            <p className="text-center text-sm text-yellow-700 mt-6 font-semibold">
              ⚠️ Escanea o escribe el código del bote para continuar con la mezcla.
            </p>
          </div>
        ) : (
          /* Si está verificado, mostrar confirmación breve */
          <div className="w-full max-w-2xl bg-green-50 border-2 border-green-400 rounded-lg p-4">
            <p className="text-center text-green-700 font-bold">
              ✓ SKU {ingredienteActual.codigo} validado - Pesando...
            </p>
          </div>
        )}

        {/* Nombre del Ingrediente Actual - GIGANTE (solo si ya está verificado) */}
        {skuVerificado && (
          <div className="text-center">
            <p className="text-sm text-gray-600 font-semibold uppercase mb-2">
              Pesando ahora:
            </p>
            <h2 className="text-7xl font-black text-gray-900 mb-2">
              {ingredienteActual.codigo}
            </h2>
            <p className="text-2xl text-gray-700">
              Meta: <span className="font-bold text-blue-600">{ingredienteActual.pesoTarget.toFixed(1)}g</span>
            </p>
          </div>
        )}

        {/* SmartScale - Solo mostrar si SKU está verificado */}
        {skuVerificado && (
          <SmartScale
            pesoActual={peso}
            pesoTarget={ingredienteActual.pesoTarget}
            tolerancia={0.5}
          />
        )}

        {/* Información de Sesión - Solo mostrar si SKU está verificado */}
        {skuVerificado && (
          <div className="w-full max-w-2xl grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <p className="text-xs text-gray-600 font-semibold uppercase">Peso Acumulado</p>
              <p className="text-3xl font-black text-gray-900">
                {pesoAcumulado.toFixed(1)} <span className="text-xl">g</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">de {pesoTotal.toFixed(1)}g totales</p>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <p className="text-xs text-gray-600 font-semibold uppercase">Receta</p>
              <p className="text-3xl font-black text-gray-900">
                #{receta.numero}
              </p>
              <p className="text-xs text-gray-500 mt-1">{receta.meta.carMaker || "—"}</p>
            </div>
          </div>
        )}

        {/* Botón Siguiente - Deshabilitado si SKU no está verificado */}
        {skuVerificado && (
          <button
            onClick={handleSiguiente}
            disabled={!enRango || guardando}
            className={`
              px-12 py-6 rounded-lg font-bold text-2xl transition-all
              ${
                enRango && !guardando
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-lg hover:shadow-xl"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
              }
            `}
          >
            {guardando 
              ? "⏳ Guardando..."
              : ingredienteActualIdx === ingredientes.length - 1 
              ? "✓ FINALIZAR MEZCLA" 
              : "SIGUIENTE INGREDIENTE →"}
          </button>
        )}

        {/* Estado del Peso - Solo mostrar si SKU está verificado */}
        {skuVerificado && (
          <div className="w-full max-w-2xl bg-gray-100 border border-gray-400 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 font-semibold mb-1">ESTADO DEL PESO</p>
            <p className={`text-xl font-bold ${
              enRango ? "text-green-600" : "text-yellow-600"
            }`}>
              {enRango ? "✓ En Rango" : "⏳ Esperando..."}
            </p>
            {estable && (
              <p className="text-xs text-green-600 font-semibold mt-2">Peso estable</p>
            )}
          </div>
        )}

        {/* Botón Cancelar */}
        <button
          onClick={onFinish}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Cancelar Mezcla
        </button>
      </main>

      {/* Footer */}
      <footer className="bg-cm-surface border-t border-cm-border p-4 text-center text-sm text-cm-text-secondary">
        <p>ColorManager v0.0.1 - Sesión de Mezcla | Build: IMPL-20260127-04</p>
      </footer>
    </div>
  )
}
