/**
 * SettingsView: Interfaz de configuración dinámica (DEMO vs PROD)
 * ID Intervención: IMPL-20260129-01
 * Respaldo: context/SPEC-CONFIG-DINAMICA.md
 */

import React, { useState, useEffect } from "react"
import { AppConfig } from "@/shared/types"

interface SettingsViewProps {
  onClose?: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cargar configuración al montar
  useEffect(() => {
    loadConfig()

    // Escuchar cambios de configuración desde el main process
    const unsubscribe = window.electron?.onConfigChanged(
      (data) => {
        console.log("[SettingsView] Configuración cambió:", data)
        if (data.newConfig) {
          setConfig(data.newConfig)
        }
      }
    )

    return () => unsubscribe?.()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.electron?.invoke("config:get")
      if (result?.success) {
        setConfig(result.config)
      } else {
        setError(result?.error || "Error al cargar configuración")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = async (newMode: "DEMO" | "PRODUCTION") => {
    if (!config) return

    try {
      setSaving(true)
      setError(null)
      const result = await window.electron?.invoke("config:setMode", newMode)
      if (result?.success) {
        setConfig(result.config)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError(result?.error || "Error al cambiar modo")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleHardwareConfigChange = async (
    key: keyof AppConfig["hardware"],
    value: string | number
  ) => {
    if (!config) return

    try {
      setSaving(true)
      setError(null)
      const result = await window.electron?.invoke("config:set", {
        hardware: {
          ...config.hardware,
          [key]: value,
        },
      })
      if (result?.success) {
        setConfig(result.config)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError(result?.error || "Error al guardar configuración")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePathChange = async (
    key: keyof AppConfig["paths"],
    value: string
  ) => {
    if (!config) return

    try {
      setSaving(true)
      setError(null)
      const result = await window.electron?.invoke("config:set", {
        paths: {
          ...config.paths,
          [key]: value,
        },
      })
      if (result?.success) {
        setConfig(result.config)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError(result?.error || "Error al guardar ruta")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm("¿Resetear toda la configuración a valores por defecto?"))
      return

    try {
      setSaving(true)
      setError(null)
      const result = await window.electron?.invoke("config:reset")
      if (result?.success) {
        setConfig(result.config)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError(result?.error || "Error al resetear")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Cargando configuración...</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error al cargar configuración</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Configuración</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Cerrar
          </button>
        )}
      </div>

      {/* Alertas */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Guardado correctamente
        </div>
      )}

      {/* Sección: Modo */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Modo de Operación</h2>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleModeChange("DEMO")}
            disabled={saving}
            className={`flex-1 py-3 px-4 rounded font-semibold transition ${
              config.mode === "DEMO"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            } disabled:opacity-50`}
          >
            📊 Modo Demo (Simulación)
          </button>
          <button
            onClick={() => handleModeChange("PRODUCTION")}
            disabled={saving}
            className={`flex-1 py-3 px-4 rounded font-semibold transition ${
              config.mode === "PRODUCTION"
                ? "bg-red-500 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            } disabled:opacity-50`}
          >
            ⚙️ Modo Producción (Real)
          </button>
        </div>

        {config.mode === "DEMO" ? (
          <p className="text-sm text-gray-600">
            ✓ Usando hardware simulado. La báscula emulará mediciones automáticamente.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            ⚠️ Usando hardware real. Conecta el dispositivo según la configuración abajo.
          </p>
        )}
      </div>

      {/* Sección: Configuración de Hardware (solo PROD) */}
      {config.mode === "PRODUCTION" && (
        <div className="mb-8 p-6 border rounded-lg bg-yellow-50">
          <h2 className="text-xl font-semibold mb-4">Configuración de Hardware</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Puerto Serial de Báscula
            </label>
            <input
              type="text"
              value={config.hardware.scalePort}
              onChange={(e) => handleHardwareConfigChange("scalePort", e.target.value)}
              onBlur={() => {}}
              disabled={saving}
              placeholder="ej: COM3, /dev/ttyUSB0"
              className="w-full px-3 py-2 border rounded disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              En Windows: COM3, COM4, etc. | En Linux/Mac: /dev/ttyUSB0, /dev/ttyACM0, etc.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Velocidad en Baudios
            </label>
            <select
              value={config.hardware.baudRate}
              onChange={(e) =>
                handleHardwareConfigChange("baudRate", parseInt(e.target.value))
              }
              disabled={saving}
              className="w-full px-3 py-2 border rounded disabled:opacity-50"
            >
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={115200}>115200</option>
            </select>
          </div>
        </div>
      )}

      {/* Sección: Rutas */}
      <div className="mb-8 p-6 border rounded-lg bg-blue-50">
        <h2 className="text-xl font-semibold mb-4">Rutas de Archivos</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📁 Carpeta Spool de Recetas
          </label>
          <input
            type="text"
            value={config.paths.sayerSpoolDir}
            onChange={(e) => handlePathChange("sayerSpoolDir", e.target.value)}
            disabled={saving}
            placeholder="Ruta absoluta a carpeta de recetas"
            className="w-full px-3 py-2 border rounded disabled:opacity-50 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Directorio donde se almacenan los archivos de recetas (*.txt)
          </p>
        </div>
      </div>

      {/* Sección: Acciones */}
      <div className="flex gap-4">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Resetear a Defectos
        </button>
        <button
          onClick={loadConfig}
          disabled={saving}
          className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
        >
          Recargar
        </button>
      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded text-xs font-mono">
        <p className="text-gray-600 mb-2">Config Actual:</p>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
    </div>
  )
}
