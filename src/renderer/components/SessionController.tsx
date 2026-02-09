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
  const { peso } = useBascula()
  const { success, showError } = useToast()
  // ... (resto del código)


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
  // Guard Clause: Validar que existan ingredientes
  if (!ingredienteActual && fase === "mezcla") {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col">
        <HeaderBar basculaConectada={basculaConectada} />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
          <p className="text-xl font-bold mb-2">⚠️ No hay ingredientes en esta receta</p>
          <button onClick={onCancel} className="text-blue-600 underline">Volver</button>
        </main>
      </div>
    )
  }

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
        operadorId: user?.id || null,
        operadorNombre: user?.nombre || null,
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
    } catch (error: any) {
      console.error("[SessionController] Error guardando mezcla:", error)
      showError(`Error al guardar mezcla: ${error.message || error}`, 5000)
      onFinish() // Aún si falla el guardado, salimos para no bloquear la pantalla
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
      <main className="flex-1 flex flex-col items-center p-2 gap-2 overflow-y-auto xl:justify-center xl:p-8 xl:gap-8 transition-all duration-300">

        {/* Progreso Responsivo */}
        <div className="w-full max-w-2xl xl:max-w-4xl bg-blue-50 border border-blue-300 rounded p-2 xl:p-4 transition-all duration-300">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs xl:text-sm font-semibold text-blue-700">PROGRESO</p>
            <p className="text-xs xl:text-sm font-bold text-blue-800">
              {ingredienteActualIdx + 1} / {ingredientes.length}
            </p>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 xl:h-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${((ingredienteActualIdx + 1) / ingredientes.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Panel de Validación SKU */}
        {!skuVerificado ? (
          <div className="w-full max-w-2xl xl:max-w-4xl bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 xl:p-10 shadow-lg mt-4 transition-all duration-300">
            <div className="text-center mb-4">
              <p className="text-4xl xl:text-6xl">🔒</p>
              <p className="text-lg xl:text-2xl font-bold text-yellow-800 mt-1">VALIDACIÓN REQUERIDA</p>
            </div>
            <div className="text-center mb-4">
              <p className="text-xs xl:text-sm text-gray-600 font-semibold uppercase mb-1">Escanea:</p>
              <h2 className="text-4xl xl:text-6xl font-black text-gray-900">{ingredienteActual.codigo}</h2>
            </div>
            <div className="mb-4">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleValidarSKU()}
                placeholder={`Escanea ${ingredienteActual.codigo}...`}
                className="w-full px-4 py-3 xl:py-5 text-center text-2xl xl:text-4xl font-bold border-2 border-yellow-400 rounded focus:outline-none focus:ring-2 focus:ring-yellow-600 bg-white"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleValidarSKU()}
                className="px-6 py-2 xl:px-10 xl:py-4 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-lg xl:text-xl transition-colors"
              >
                Validar
              </button>
              {/* Botón Bypass Eliminado */}
            </div>
          </div>
        ) : (
          /* Header Pesaje Compacto (Responsivo) */
          <div className="w-full max-w-2xl xl:max-w-4xl flex justify-between items-end px-2 xl:px-0 transition-all duration-300">
            <div>
              <p className="text-xs xl:text-base text-gray-500 font-semibold uppercase">Pesando:</p>
              <h2 className="text-3xl xl:text-5xl font-black text-gray-900 leading-none">{ingredienteActual.codigo}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs xl:text-base text-gray-500 font-semibold uppercase">Meta</p>
              <p className="text-2xl xl:text-4xl font-bold text-blue-600 leading-none">{ingredienteActual.pesoTarget.toFixed(1)}g</p>
            </div>
          </div>
        )}

        {/* Panel de Pesaje (Solo si verificado) */}
        {skuVerificado && (
          <>
            <div className="w-full max-w-2xl xl:max-w-4xl transition-all duration-300">
              <SmartScale
                pesoActual={peso}
                pesoTarget={ingredienteActual.pesoTarget}
                tolerancia={0.5}
              />
            </div>

            {/* Grid Informativo - Responsivo */}
            <div className="w-full max-w-2xl xl:max-w-4xl grid grid-cols-3 gap-2 xl:gap-6 transition-all duration-300">
              <div className="bg-white border border-gray-300 rounded p-2 xl:p-6 text-center shadow-sm">
                <p className="text-[10px] xl:text-xs text-gray-500 font-semibold uppercase">Acumulado</p>
                <p className="text-xl xl:text-3xl font-black text-gray-800">{pesoAcumulado.toFixed(1)}g</p>
              </div>
              <div className="bg-white border border-gray-300 rounded p-2 xl:p-6 text-center shadow-sm">
                <p className="text-[10px] xl:text-xs text-gray-500 font-semibold uppercase">Receta</p>
                <p className="text-xl xl:text-3xl font-black text-gray-800">#{receta.numero}</p>
              </div>
              {/* Estado del Peso Integrado */}
              <div className={`border rounded p-2 xl:p-6 text-center shadow-sm ${enRango ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
                <p className="text-[10px] xl:text-xs text-gray-500 font-semibold uppercase">Estado</p>
                <p className={`text-xl xl:text-3xl font-bold ${enRango ? "text-green-600" : "text-yellow-600"}`}>
                  {enRango ? "OK" : "..."}
                </p>
              </div>
            </div>

            {/* Area de Botones Unificada - Responsiva */}
            <div className="w-full max-w-2xl xl:max-w-4xl flex gap-3 mt-1 xl:mt-4 transition-all duration-300">
              <button
                onClick={onCancel || onFinish}
                className="flex-1 py-3 xl:py-5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded font-semibold text-sm xl:text-lg transition-colors"
                title="Cancelar Mezcla"
              >
                ✕ Cancelar
              </button>

              <button
                onClick={handleSiguiente}
                disabled={!enRango || guardando}
                className={`
                  flex-[3] py-3 xl:py-5 rounded font-bold text-xl xl:text-2xl transition-all shadow-md
                  ${enRango && !guardando
                    ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50 shadow-none"
                  }
                `}
              >
                {guardando ? "⏳..." : ingredienteActualIdx === ingredientes.length - 1 ? "✓ FINALIZAR" : "SIGUIENTE →"}
              </button>
            </div>
          </>
        )}
      </main>
      <footer className="bg-cm-surface border-t border-cm-border p-4 text-center text-sm text-cm-text-secondary">
        <p>ColorManager v0.0.1 - Sesión de Mezcla (Refactored) | Build: FIX-20260206-DEBT</p>
      </footer>
    </div>
  )
}
