/**
 * SessionController Component (Refactorizado)
 * Orquesta el flujo de mezcla con una receta
 * UI delegada a subcomponentes: MixSummary, ManualAdjustmentPanel, SessionClosureForm
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
import MixSummary from "./MixSummary"
import ManualAdjustmentPanel from "./ManualAdjustmentPanel"
import SessionClosureForm from "./SessionClosureForm"
import { useAuth } from "../context/AuthProvider"

interface SessionControllerProps {
  receta: RecetaSayer
  onFinish: () => void
  onCancel?: () => void
}

export default function SessionController({ receta, onFinish, onCancel }: SessionControllerProps) {
  const { user } = useAuth() // Obtener usuario actual

  // ... (resto del código)

  // En handleGuardarFinal
  const registro: RegistroMezcla = {
    id: `MZC-${Date.now()}`,
    recetaId: `RECETA-${receta.numero}`,
    recetaNombre: `Receta ${receta.numero}`,
    fecha: new Date().toISOString(),
    horaInicio,
    horaFin: new Date().toISOString(),
    pesoTotal: pesoTotal,
    pesoFinal: pesoFinalReal,
    ingredientes: ingredientesLog,
    estado,
    diferencia,
    tolerancia,
    cliente: data.cliente || null,
    vehiculo: data.vehiculo || null,
    tipoMezcla: "NUEVA",
    operadorId: user?.id,         // Asignar ID de operador
    operadorNombre: user?.nombre, // Asignar Nombre
    // guardarReceta no se usa en backend aun
  }
  const [ingredienteActualIdx, setIngredienteActualIdx] = useState(0)
  const [basculaConectada] = useState(true)
  const [pesosRegistrados, setPesosRegistrados] = useState<number[]>([]) // Pesos por ingrediente
  const [horaInicio] = useState(new Date().toISOString())
  const [guardando, setGuardando] = useState(false)
  const [fase, setFase] = useState<"mezcla" | "resumen" | "ajuste" | "cierre">("mezcla")

  // Estado de Validación
  const [skuVerificado, setSkuVerificado] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Estado de Ajustes Manuales
  const [ajustes, setAjustes] = useState<{ codigo: string; peso: number; timestamp: string }[]>([])
  const [ajusteStep, setAjusteStep] = useState<"escanear" | "pesar">("escanear")
  const [ajusteSkuActual, setAjusteSkuActual] = useState("")

  // --- Lógica de Negocio ---

  // Mapear ingredientes
  const ingredientes: IngredienteReceta[] = receta.capas.flatMap((capa) =>
    capa.ingredientes.map((ing) => ({
      codigo: ing.sku,
      nombre: ing.sku,
      pesoTarget: ing.pesoMeta,
      orden: ing.orden,
    }))
  )

  const ingredienteActual = ingredientes[ingredienteActualIdx]
  const pesoTotal = ingredientes.reduce((sum, ing) => sum + ing.pesoTarget, 0)
  const pesoAcumulado = ingredientes
    .slice(0, ingredienteActualIdx)
    .reduce((sum, ing) => sum + ing.pesoTarget, 0)
  const pesoFinalCalculado = pesosRegistrados.reduce((a, b) => a + b, 0) + ajustes.reduce((sum, aj) => sum + aj.peso, 0)

  // Iniciar Mezcla
  useEffect(() => {
    if (window.colorManager) {
      console.log("[SessionController] Iniciando mezcla...")
      window.colorManager.iniciarMezcla("RECETA-" + receta.numero)
    }
  }, [receta.numero])

  // Reset al cambiar ingrediente
  useEffect(() => {
    setSkuVerificado(false)
    setInputValue("")
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [ingredienteActualIdx, fase])

  // Helpers
  const extractBaseSKU = (codigo: string): string => codigo.replace(/[.-]\d{2}$/, '')

  // Handlers
  const handleValidarSKU = (overrideInput?: string) => {
    const inputToValidate = overrideInput || inputValue
    const inputTrimmed = inputToValidate.trim()
    const skuEsperado = ingredienteActual.codigo.trim().toUpperCase()
    const skuEscaneado = extractBaseSKU(inputTrimmed).toUpperCase()

    if (skuEscaneado === skuEsperado) {
      setSkuVerificado(true)
      setInputValue("")
      success(`✓ SKU ${skuEsperado} validado correctamente`, 2000)
    } else {
      showError(`✗ SKU incorrecto. Esperado: ${skuEsperado}. Escaneado: ${skuEscaneado}`, 3000)
      setInputValue("")
    }
  }

  const handleValidarSkuAjuste = (skuInput: string) => {
    const skuDetectado = extractBaseSKU(skuInput).toUpperCase()
    if (skuDetectado.length < 3) {
      showError("Código inválido", 2000)
      return
    }
    setAjusteSkuActual(skuDetectado)
    setAjusteStep("pesar")
    success(`✓ Ajustando con: ${skuDetectado}`, 2000)
    if (window.colorManager?.tara) window.colorManager.tara().catch(console.error)
  }

  const handleBypass = () => {
    if (fase === 'mezcla') {
      setSkuVerificado(true)
      success("🔓 Validación bypassed", 2000)
    } else if (fase === 'ajuste') {
      setAjusteSkuActual("MANUAL-ADJUST")
      setAjusteStep("pesar")
      if (window.colorManager?.tara) window.colorManager.tara().catch(console.error)
    }
  }

  const handleSiguiente = async () => {
    const nuevosPesos = [...pesosRegistrados, peso]
    setPesosRegistrados(nuevosPesos)

    if (ingredienteActualIdx < ingredientes.length - 1) {
      setIngredienteActualIdx(ingredienteActualIdx + 1)
      if (window.colorManager?.tara) await window.colorManager.tara()
    } else {
      setFase("resumen")
    }
  }

  const handleAgregarAjuste = () => {
    const pesoAgregado = Math.max(0, peso)
    if (pesoAgregado <= 0.1) {
      showError("Peso inválido (mínimo 0.1g)", 2000)
      return
    }
    setAjustes([...ajustes, {
      codigo: ajusteSkuActual,
      peso: pesoAgregado,
      timestamp: new Date().toISOString()
    }])
    success(`+${pesoAgregado.toFixed(1)}g agregado`, 2000)
    setAjusteStep("escanear")
    setAjusteSkuActual("")
  }

  const handleGuardarFinal = async (data: { cliente: string; vehiculo: string; guardarReceta: boolean }) => {
    try {
      setGuardando(true)
      if (!window.colorManager?.guardarMezcla) {
        onFinish()
        return
      }

      const pesoBase = pesosRegistrados.reduce((a, b) => a + b, 0)
      const pesoAjustes = ajustes.reduce((acc, curr) => acc + curr.peso, 0)
      const pesoFinalReal = pesoBase + pesoAjustes

      const tolerancia = 0.5
      const diferencia = pesoFinalReal - pesoTotal
      const estado = Math.abs(diferencia) <= tolerancia ? "perfecto" : "desviado"

      const ingredientesLog = [
        ...ingredientes.map((ing, idx) => ({
          codigo: ing.codigo,
          pesoTarget: ing.pesoTarget,
          pesoPesado: pesosRegistrados[idx] || 0,
        })),
        ...ajustes.map(adj => ({
          codigo: adj.codigo,
          pesoTarget: 0,
          pesoPesado: adj.peso
        }))
      ]

      const registro: RegistroMezcla = {
        id: `MZC-${Date.now()}`,
        recetaId: `RECETA-${receta.numero}`,
        recetaNombre: `Receta ${receta.numero}`,
        fecha: new Date().toISOString(),
        horaInicio,
        horaFin: new Date().toISOString(),
        pesoTotal: pesoTotal,
        pesoFinal: pesoFinalReal,
        ingredientes: ingredientesLog,
        estado,
        diferencia,
        tolerancia,
        cliente: data.cliente || null,
        vehiculo: data.vehiculo || null,
        tipoMezcla: "NUEVA",
        operadorId: user?.id,
        operadorNombre: user?.nombre,
        // guardarReceta no se usa en backend aun
      }

      await window.colorManager.guardarMezcla(registro)
      success("✓ Mezcla guardada correctamente", 3000)

      if (window.colorManager?.printMixLabel) {
        try {
          success("🖨️ Imprimiendo etiqueta...", 2000)
          await window.colorManager.printMixLabel({
            id: registro.id,
            nombre: registro.recetaNombre,
            cliente: registro.cliente,
            vehiculo: registro.vehiculo,
            fecha: new Date().toLocaleDateString()
          })
        } catch (err) {
          console.error("Error imprimiendo etiqueta:", err)
          showError("Error imprimiendo etiqueta", 3000)
        }
      }
      onFinish()
    } catch (error) {
      console.error("[SessionController] Error guardando mezcla:", error)
      showError(`Error al guardar mezcla`, 4000)
      onFinish()
    } finally {
      setGuardando(false)
    }
  }

  // --- RENDER ---

  if (fase === "resumen") {
    return (
      <>
        <HeaderBar basculaConectada={basculaConectada} />
        <MixSummary
          recetaNumero={receta.numero}
          pesoTotal={pesoTotal}
          pesoFinalCalculado={pesoFinalCalculado}
          onManualAdjustment={() => {
            setFase("ajuste")
            setAjusteStep("escanear")
          }}
          onContinue={() => setFase("cierre")}
        />
      </>
    )
  }

  if (fase === "ajuste") {
    return (
      <>
        <HeaderBar basculaConectada={basculaConectada} />
        <ManualAdjustmentPanel
          totalGlobal={pesoFinalCalculado}
          ajusteStep={ajusteStep}
          ajusteSkuActual={ajusteSkuActual}
          peso={peso}
          onValidarSku={handleValidarSkuAjuste}
          onBypass={handleBypass}
          onCancel={() => {
            setAjusteStep("escanear")
            setAjusteSkuActual("")
          }}
          onAddAdjustment={handleAgregarAjuste}
          onFinishAdjustments={() => {
            // Guardar o ir a resumen? El original iba directo a "guardarMezcla", 
            // pero lo ideal es ir a resumen o cierre.
            // Para mantener compatibilidad con flujo anterior, asumimos "Terminar Ajustes" -> Cierre?
            // El original llamaba a guardarMezcla directo. Mejor vamos a cierre.
            setFase("cierre")
          }}
        />
      </>
    )
  }

  if (fase === "cierre") {
    return (
      <>
        <HeaderBar basculaConectada={basculaConectada} />
        <SessionClosureForm
          pesoFinalCalculado={pesoFinalCalculado}
          recetaMeta={receta.meta}
          onBack={() => setFase("resumen")}
          onSave={handleGuardarFinal}
          guardando={guardando}
        />
      </>
    )
  }

  // FASE: MEZCLA (Default)
  const tolerancia = 0.5
  const minTarget = ingredienteActual.pesoTarget - tolerancia
  const maxTarget = ingredienteActual.pesoTarget + tolerancia
  const enRango = peso >= minTarget && peso <= maxTarget

  return (
    <div className="min-h-screen bg-cm-bg flex flex-col">
      <HeaderBar basculaConectada={basculaConectada} />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">

        {/* Progreso */}
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
              style={{ width: `${((ingredienteActualIdx + 1) / ingredientes.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Panel de Validación SKU */}
        {!skuVerificado ? (
          <div className="w-full max-w-2xl bg-yellow-50 border-4 border-yellow-400 rounded-lg p-8 shadow-lg">
            <div className="text-center mb-4">
              <p className="text-6xl">🔒</p>
              <p className="text-xl font-bold text-yellow-800 mt-2">VALIDACIÓN REQUERIDA</p>
            </div>
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 font-semibold uppercase mb-2">Escanea el código correcto:</p>
              <h2 className="text-6xl font-black text-gray-900 mb-2">{ingredienteActual.codigo}</h2>
            </div>
            <div className="mb-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleValidarSKU()}
                placeholder={`Escanea el código ${ingredienteActual.codigo}...`}
                className="w-full px-6 py-4 text-center text-3xl font-bold border-2 border-yellow-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600 bg-white"
                autoFocus
              />
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleValidarSKU()}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors"
              >
                ✓ Validar
              </button>
              <button
                onClick={handleBypass}
                className="px-3 py-3 bg-gray-400 hover:bg-gray-500 text-gray-700 text-xs rounded font-semibold transition-colors opacity-60 hover:opacity-100"
              >
                🔓 Bypass
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-green-50 border-2 border-green-400 rounded-lg p-4">
            <p className="text-center text-green-700 font-bold">✓ SKU {ingredienteActual.codigo} validado - Pesando...</p>
          </div>
        )}

        {/* Panel de Pesaje (Solo si verificado) */}
        {skuVerificado && (
          <>
            <div className="text-center">
              <p className="text-sm text-gray-600 font-semibold uppercase mb-2">Pesando ahora:</p>
              <h2 className="text-7xl font-black text-gray-900 mb-2">{ingredienteActual.codigo}</h2>
              <p className="text-2xl text-gray-700">
                Meta: <span className="font-bold text-blue-600">{ingredienteActual.pesoTarget.toFixed(1)}g</span>
              </p>
            </div>

            <SmartScale
              pesoActual={peso}
              pesoTarget={ingredienteActual.pesoTarget}
              tolerancia={0.5}
            />

            <div className="w-full max-w-2xl grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <p className="text-xs text-gray-600 font-semibold uppercase">Peso Acumulado</p>
                <p className="text-3xl font-black text-gray-900">{pesoAcumulado.toFixed(1)} <span className="text-xl">g</span></p>
              </div>
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <p className="text-xs text-gray-600 font-semibold uppercase">Receta</p>
                <p className="text-3xl font-black text-gray-900">#{receta.numero}</p>
                <p className="text-xs text-gray-500 mt-1">{receta.meta.carMaker || "—"}</p>
              </div>
            </div>

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
              {guardando ? "⏳ Guardando..." : ingredienteActualIdx === ingredientes.length - 1 ? "✓ FINALIZAR MEZCLA" : "SIGUIENTE INGREDIENTE →"}
            </button>

            <div className="w-full max-w-2xl bg-gray-100 border border-gray-400 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-1">ESTADO DEL PESO</p>
              <p className={`text-xl font-bold ${enRango ? "text-green-600" : "text-yellow-600"}`}>
                {enRango ? "✓ En Rango" : "⏳ Esperando..."}
              </p>
            </div>
          </>
        )}

        <div className="mt-auto w-full max-w-2xl">
          <button
            onClick={onCancel || onFinish}
            className="w-full py-4 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>✕</span> Cancelar Mezcla
          </button>
        </div>
      </main>
      <footer className="bg-cm-surface border-t border-cm-border p-4 text-center text-sm text-cm-text-secondary">
        <p>ColorManager v0.0.1 - Sesión de Mezcla (Refactored) | Build: FIX-20260206-DEBT</p>
      </footer>
    </div>
  )
}
