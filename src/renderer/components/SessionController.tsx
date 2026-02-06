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
  onCancel?: () => void  // FIX-20260204-17: Callback separado para cancelar
}

/**
 * Componente que controla la sesión de mezcla
 * Muestra el ingrediente actual y facilita la navegación entre ingredientes
 * IMPL-20260127-06: Valida SKU antes de permitir pesaje
 */
export default function SessionController({ receta, onFinish, onCancel }: SessionControllerProps) {
  const { peso, estable } = useBascula()
  const { success, error: showError } = useToast()
  const [ingredienteActualIdx, setIngredienteActualIdx] = useState(0)
  const [basculaConectada] = useState(true)
  const [pesosRegistrados, setPesosRegistrados] = useState<number[]>([]) // Pesos por ingrediente
  const [horaInicio] = useState(new Date().toISOString())
  const [guardando, setGuardando] = useState(false)

  const [fase, setFase] = useState<"mezcla" | "resumen" | "ajuste">("mezcla")
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

  // ARCH-20260204-01: Extrae SKU base de código de etiqueta
  // "KT-1400-01" → "KT-1400", "KT-1400" → "KT-1400"
  const extractBaseSKU = (codigo: string): string => {
    return codigo.replace(/[.-]\d{2}$/, '')
  }

  // IMPL-20260127-06: Validar SKU al presionar ENTER
  // ARCH-20260204-01: Ahora acepta códigos con sufijo de bote (-01, -02, etc.)
  const handleValidarSKU = () => {
    const inputTrimmed = inputValue.trim()
    const skuEsperado = ingredienteActual.codigo.trim().toUpperCase()

    // Extraer SKU base del código escaneado (ignora sufijo -## si existe)
    const skuEscaneado = extractBaseSKU(inputTrimmed).toUpperCase()

    // Comparación case-insensitive del SKU base
    if (skuEscaneado === skuEsperado) {
      setSkuVerificado(true)
      setInputValue("")
      // Mostrar código completo escaneado para trazabilidad
      const msg = inputTrimmed.toUpperCase() !== skuEsperado
        ? `✓ Bote ${inputTrimmed.toUpperCase()} validado (SKU: ${skuEsperado})`
        : `✓ SKU ${skuEsperado} validado correctamente`
      success(msg, 2000)
      console.log(`[SessionController] SKU validado: ${skuEsperado}, Escaneado: ${inputTrimmed}`)
    } else {
      showError(
        `✗ SKU incorrecto. Esperado: ${skuEsperado}. Escaneado: ${skuEscaneado}`,
        3000
      )
      setInputValue("")
      console.warn(`[SessionController] SKU inválido. Esperado: ${skuEsperado}, Recibido: ${skuEscaneado}`)
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
      // Fin de los ingredientes: Ir a Resumen
      console.log("[SessionController] Mezcla completada, yendo a resumen...")
      setFase("resumen")
    }
  }

  // Manejador para iniciar ajuste manual
  const handleIniciarAjuste = async () => {
    setPesoAjusteInicial(peso) // Guardar peso actual como base (debería ser el total acumulado si no se taró)
    // O mejor, hacemos TARA para empezar a medir solo lo agregado
    if (window.colorManager?.tara) {
      await window.colorManager.tara()
    }
    setPesoAjusteAgregado(0)
    setFase("ajuste")
  }

  // Manejador para finalizar desde el resumen o ajuste
  const handleFinalizarTotal = async () => {
    // Calcular peso final real incluyendo ajustes
    // El array pesosRegistrados tiene los componentes. 
    // Si hubo ajuste, deberíamos sumarlo o registrarlo como un ingrediente extra "Ajuste Manual"?
    // Por simplicidad para el MVP, guardamos los pesos registrados y si hay ajuste, lo notamos en el log o sumamos al total.

    // Si estamos en ajuste, el peso "extra" es lo que marca la báscula (asumiendo tara al iniciar ajuste)
    let pesosFinales = [...pesosRegistrados]

    if (fase === 'ajuste') {
      // Si se hizo ajuste, agregamos un "ingrediente" virtual o simplemente actualizamos el peso total en el registro
      // Para mantener la estructura de ingredientes alineada con la receta, NO agregamos al array de ingredientes pesados 
      // (que mapean 1:1 con la receta), pero el RegistroMezcla tiene pesoFinal.
      // Podríamos agregar un campo "pesoAjuste" al registro en el futuro.
    }

    await guardarMezcla(pesosFinales)
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
      // Peso de ingredientes (receta base)
      const pesoBase = pesos.reduce((a, b) => a + b, 0)
      const tolerancia = 0.5 // gramos

      // Peso final real sumando los ingredientes pesados + ajuste manual si lo hubo
      let pesoFinalReal = pesoBase

      if (fase === 'ajuste') {
        // En fase ajuste hicimos TARA, así que 'peso' es lo agregado extra
        // Usamos Math.max(0, peso) para evitar valores negativos si la balanza fluctúa
        pesoFinalReal += Math.max(0, peso)
      }

      const diferencia = pesoFinalReal - pesoTotal
      const estado = Math.abs(diferencia) <= tolerancia ? "perfecto" : "desviado"

      const registro: RegistroMezcla = {
        id: `MZC-${Date.now()}`,
        recetaId: `RECETA-${receta.numero}`,
        recetaNombre: `Receta ${receta.numero}`,
        fecha: ahora.toISOString(),
        horaInicio,
        horaFin: ahora.toISOString(),
        pesoTotal,
        pesoFinal: pesoFinalReal,
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

  // Renderizado condicional según fase
  if (fase === "resumen") {
    const pesoFinalCalculado = pesosRegistrados.reduce((a, b) => a + b, 0) + ajustes.reduce((sum, aj) => sum + aj.peso, 0)
    const dif = pesoFinalCalculado - pesoTotal
    const esExacto = Math.abs(dif) <= 0.5

    return (
      <div className="min-h-screen bg-cm-bg flex flex-col">
        <HeaderBar basculaConectada={basculaConectada} />
        <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">¡Mezcla Completada!</h2>
            <p className="text-gray-600">Receta #{receta.numero}</p>
          </div>

          <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Meta</p>
              <p className="text-4xl font-black text-blue-600">{pesoTotal.toFixed(1)}g</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Obtenido</p>
              <p className={`text-4xl font-black ${esExacto ? 'text-green-600' : 'text-yellow-600'}`}>
                {pesoFinalCalculado.toFixed(1)}g
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
              <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Diferencia</p>
              <p className={`text-4xl font-black ${esExacto ? 'text-green-600' : 'text-red-500'}`}>
                {dif > 0 ? '+' : ''}{dif.toFixed(1)}g
              </p>
            </div>
          </div>

          <div className="flex gap-6 mt-8">
            <button
              onClick={handleIniciarAjuste}
              className="px-8 py-6 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-2 border-yellow-400 rounded-xl font-bold text-xl flex flex-col items-center gap-2 transition-all"
            >
              <span>🧪 Ajustar Manualmente</span>
              <span className="text-sm font-normal opacity-75">Agregar más tinte/base</span>
            </button>

            <button
              onClick={handleFinalizarTotal}
              className="px-12 py-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-2xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center gap-2"
            >
              <span>✅ Finalizar y Guardar</span>
              <span className="text-sm font-normal opacity-90">Cerrar sesión de mezcla</span>
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (fase === "ajuste") {
    const totalAjustado = ajustes.reduce((sum, aj) => sum + aj.peso, 0)
    const totalGlobal = pesosRegistrados.reduce((a, b) => a + b, 0) + totalAjustado + (ajusteStep === 'pesar' ? Math.max(0, peso) : 0)

    return (
      <div className="min-h-screen bg-cm-bg flex flex-col border-8 border-yellow-400">
        <HeaderBar basculaConectada={basculaConectada} />
        <div className="bg-yellow-400 text-yellow-900 px-4 py-2 font-bold text-center flex justify-between items-center">
          <span>⚠️ MODO AJUSTE MANUAL</span>
          <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Ajustes: {ajustes.length} | +{totalAjustado.toFixed(1)}g</span>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
          {ajusteStep === 'escanear' ? (
            // PASO 1: ESCANEAR
            <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg border border-yellow-300">
              <div className="text-center mb-6">
                <p className="text-6xl mb-2">🔍</p>
                <h2 className="text-3xl font-bold text-gray-800">¿Qué vas a agregar?</h2>
                <p className="text-gray-500">Escanea el bote para registrar trazabilidad</p>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleValidarSKU()}
                placeholder="Escanea el código..."
                className="w-full px-6 py-4 text-center text-3xl font-bold border-2 border-yellow-400 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-200 mb-6 bg-yellow-50"
                autoFocus
              />

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleBypassValidacion}
                  className="text-gray-400 text-xs hover:text-gray-600 underline"
                >
                  Modo Pruebas (Sin Escáner)
                </button>
              </div>

              <div className="mt-8 border-t border-gray-100 pt-4">
                <button
                  onClick={handleFinalizarTotal}
                  className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                >
                  ✅ Terminar Ajustes y Guardar (Total: {totalGlobal.toFixed(1)}g)
                </button>
              </div>
            </div>
          ) : (
            // PASO 2: PESAR
            <div className="w-full max-w-2xl text-center">
              <div className="mb-6">
                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Agregando</p>
                <h2 className="text-6xl font-black text-gray-900">{ajusteSkuActual}</h2>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-blue-500 mb-8">
                <p className="text-gray-400 text-sm mb-2">PESO AGREGADO</p>
                <p className="text-8xl font-black text-blue-600 tabular-nums">
                  {peso.toFixed(1)}<span className="text-4xl text-gray-400">g</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setAjusteStep("escanear")
                    setAjusteSkuActual("")
                  }}
                  className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAgregarAjuste}
                  className="flex-[2] py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-2xl shadow-lg transition-colors"
                >
                  💾 Registrar +{Math.max(0, peso).toFixed(1)}g
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

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
              ${enRango && !guardando
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
            <p className={`text-xl font-bold ${enRango ? "text-green-600" : "text-yellow-600"
              }`}>
              {enRango ? "✓ En Rango" : "⏳ Esperando..."}
            </p>
            {estable && (
              <p className="text-xs text-green-600 font-semibold mt-2">Peso estable</p>
            )}
          </div>
        )}

        {/* Botón Cancelar - FIX UI */}
        <div className="mt-auto w-full max-w-2xl">
          <button
            onClick={onCancel || onFinish}
            className="w-full py-4 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>✕</span> Cancelar Mezcla
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-cm-surface border-t border-cm-border p-4 text-center text-sm text-cm-text-secondary">
        <p>ColorManager v0.0.1 - Sesión de Mezcla | Build: IMPL-20260127-04</p>
      </footer>
    </div>
  )
}
