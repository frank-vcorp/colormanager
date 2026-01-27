/**
 * Hook useBascula
 * Gestiona la suscripción a eventos de peso desde la báscula
 * Provee peso actual, estado de estabilidad y método de tara
 * 
 * ID Intervención: IMPL-20260127-04
 * @see SPEC-UX-COLORMANAGER.md
 */

import { useState, useEffect, useCallback } from "react"
import { PesoEvent } from "@shared/types"

export interface UseBasculaReturn {
  peso: number
  estable: boolean
  realizarTara: () => Promise<void>
  desuscribirse: (() => void) | null
}

/**
 * Hook que se suscribe a cambios de peso desde window.colorManager
 * Mantiene el estado del peso actual y su estabilidad
 * Proporciona método para ejecutar tara
 */
export function useBascula(): UseBasculaReturn {
  const [peso, setPeso] = useState(0)
  const [estable, setEstable] = useState(false)
  const [desuscribirse, setDesuscribirse] = useState<(() => void) | null>(null)

  // Al montar, suscribirse a cambios de peso
  useEffect(() => {
    if (!window.colorManager) {
      console.warn("[useBascula] window.colorManager no está disponible")
      return
    }

    // Suscribirse al evento de peso actualizado
    const unsub = window.colorManager.onPesoActualizado((evento: PesoEvent) => {
      setPeso(evento.peso)
      setEstable(evento.estable)
    })

    setDesuscribirse(() => unsub)

    // Limpiar suscripción al desmontar
    return () => {
      if (unsub) unsub()
    }
  }, [])

  // Función para realizar tara
  const realizarTara = useCallback(async () => {
    if (!window.colorManager) {
      console.warn("[useBascula] window.colorManager no está disponible para tara")
      return
    }
    try {
      await window.colorManager.tara()
      setPeso(0)
      setEstable(false)
    } catch (error) {
      console.error("[useBascula] Error al realizar tara:", error)
    }
  }, [])

  return {
    peso,
    estable,
    realizarTara,
    desuscribirse,
  }
}
