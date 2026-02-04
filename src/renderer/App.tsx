/**
 * App Component
 * Interfaz principal de ColorManager
 * Estilo: Clean Industrial (SPEC-UX-UI)
 * 
 * ID Intervención: IMPL-20260127-06 (Tipado seguro + Toasts + Modales)
 * FIX REFERENCE: FIX-20260127-03 - Eliminado import de electron.d.ts (tipos globales no se importan)
 * @updated IMPL-20260128-01: Integración de AuthProvider y LoginView
 * @see /src/renderer/types/electron.d.ts para interfaz Window.colorManager
 */

// Nota: Los tipos de electron.d.ts son globales (declare global) y se cargan automáticamente via tsconfig
import { useState, useEffect } from "react"
import { PesoEvent, RecetaSayer } from "@shared/types"
import { ToastProvider } from "./hooks/useToast" // FIX-20260127-03: extensión cambiada a .tsx
import { ModalProvider } from "./components/ui/Modal"
import { AuthProvider, useAuth } from "./context/AuthProvider"
import Toast from "./components/ui/Toast"
import ScaleDisplay from "./components/ScaleDisplay"
import HeaderBar from "./components/HeaderBar"
import SessionController from "./components/SessionController"
import HistoryView from "./components/HistoryView"
import InventoryView from "./components/InventoryView"
import MisMezclasView from "./components/MisMezclasView"
import { AdminLoginModal } from "./components/AdminLoginModal"
import { RegistroMezcla } from "@shared/types"

/**
 * AppContent: Controlador principal de vistas
 * ARCH-20260130-01: Ya no requiere login, modo Entonador abierto
 */
function AppContent() {
  const { loading } = useAuth()

  // Si está cargando, mostrar spinner simple
  if (loading) {
    return (
      <div className="h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-[#cccccc]">Cargando ColorManager...</p>
        </div>
      </div>
    )
  }

  // ARCH-20260130-01: Siempre mostrar la app (modo Entonador por defecto)
  return <AppMain />
}

function AppMain() {
  const [pesoActual, setPesoActual] = useState(0)
  const [basculaConectada, setBasculaConectada] = useState(false)
  const [mezclando, setMezclando] = useState(false)
  const [recetaDetectada, setRecetaDetectada] = useState<RecetaSayer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sesionMezcla, setSesionMezcla] = useState(false)
  const [vista, setVista] = useState<"home" | "mezcla" | "historial" | "inventario" | "mis-mezclas">("home")
  const [showAdminLogin, setShowAdminLogin] = useState(false) // Modal login Admin

  // Listeners para cambios de peso y recetas
  useEffect(() => {
    if (!window.colorManager) return

    window.colorManager.onPesoActualizado((evento: PesoEvent) => {
      setPesoActual(evento.peso)
    })

    window.colorManager.onEstadoBascula((estado) => {
      setBasculaConectada(estado.conectada)
    })

    window.colorManager.onRecetaDetectada((receta: RecetaSayer) => {
      console.log("[App] Receta detectada:", receta)
      setRecetaDetectada(receta)
      setError(null)
    })

    window.colorManager.onError((error: Error | string) => {
      console.error("[App] Error del sistema:", error)
      const message = typeof error === "string" ? error : error.message || "Error desconocido"
      setError(message)
    })
  }, [])

  const handleIniciarMezcla = async () => {
    if (!recetaDetectada) {
      console.warn("[App] No hay receta detectada para iniciar mezcla")
      return
    }
    try {
      await window.colorManager.iniciarMezcla("RECETA-" + recetaDetectada.numero)
      setMezclando(true)
      setSesionMezcla(true)
      setVista("mezcla")
    } catch (error) {
      console.error("Error iniciando mezcla:", error)
    }
  }

  const handleFinalizarMezcla = async () => {
    try {
      await window.colorManager.cancelarMezcla()
      setSesionMezcla(false) // Volver a la pantalla principal
      setMezclando(false)
      setRecetaDetectada(null) // Limpiar receta
      setVista("home") // Volver a vista home

      // ARCH-20260130-02: Auto-minimizar al finalizar mezcla
      setTimeout(() => {
        window.colorManager.minimizarVentana()
      }, 500)
    } catch (error) {
      console.error("Error finalizando mezcla:", error)
    }
  }

  // Repetir mezcla: cargar receta desde mezcla existente
  const handleRepetirMezcla = async (mezcla: RegistroMezcla) => {
    console.log("[App] Repetir mezcla:", mezcla.id)
    // TODO: Cargar la receta correspondiente desde la mezcla
    // Por ahora, volvemos a home y mostramos mensaje
    alert(`Función en desarrollo: Repetir mezcla #${mezcla.recetaId}`)
    setVista("home")
  }

  // Callback para HeaderBar: Admin
  const handleAdminClick = () => {
    setShowAdminLogin(true)
  }

  return (
    <div className="h-screen bg-[#1e1e1e] flex flex-col overflow-hidden">
      <Toast />

      {/* Modal Login Admin */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
      />

      {/* Vista: Mis Mezclas (Entonador) */}
      {vista === "mis-mezclas" && (
        <MisMezclasView
          onBack={() => setVista("home")}
          onRepetirMezcla={handleRepetirMezcla}
        />
      )}

      {/* Vista: Inventario */}
      {vista === "inventario" && (
        <InventoryView onBack={() => setVista("home")} />
      )}

      {/* Vista: Historial */}
      {vista === "historial" && (
        <HistoryView onBack={() => setVista("home")} />
      )}

      {/* Vista: Mezcla */}
      {vista === "mezcla" && sesionMezcla && recetaDetectada && (
        <SessionController
          receta={recetaDetectada}
          onFinish={handleFinalizarMezcla}
        />
      )}

      {/* Vista: Home - Layout estilo IDE */}
      {vista === "home" && (
        <div className="flex flex-col h-full">
          {/* Header compacto estilo VS Code */}
          <HeaderBar
            basculaConectada={basculaConectada}
            onHistorialClick={() => setVista("historial")}
            onInventarioClick={() => setVista("inventario")}
            onMisMezclasClick={() => setVista("mis-mezclas")}
            onAdminClick={handleAdminClick}
          />

          {/* Main area con sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar izquierdo - Receta detectada */}
            <aside className="w-72 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
              {/* Título del sidebar */}
              <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-[#6e6e6e] border-b border-[#3c3c3c]">
                Receta Activa
              </div>

              {/* Contenido del sidebar */}
              <div className="flex-1 overflow-auto p-3">
                {recetaDetectada ? (
                  <div className="space-y-3">
                    {/* Info de la receta */}
                    <div className="bg-[#2d2d2d] rounded p-3 border border-[#3c3c3c]">
                      <p className="text-blue-400 font-mono text-sm mb-1">#{recetaDetectada.numero}</p>
                      <p className="text-[#cccccc] text-xs">{recetaDetectada.meta?.colorCode || "Receta detectada"}</p>
                    </div>

                    {/* Lista de ingredientes (todas las capas) */}
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-[#6e6e6e] mb-2">Ingredientes</p>
                      {recetaDetectada.capas?.flatMap((capa, capaIdx) =>
                        capa.ingredientes?.map((ing, idx) => (
                          <div key={`${capaIdx}-${idx}`} className="flex justify-between text-xs py-1.5 px-2 bg-[#2d2d2d] rounded">
                            <span className="text-[#cccccc] font-mono">{ing.sku}</span>
                            <span className="text-[#6e6e6e]">{ing.pesoMeta}g</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Botón iniciar mezcla */}
                    <button
                      onClick={handleIniciarMezcla}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded text-sm font-medium transition-colors"
                    >
                      ▶ Iniciar Mezcla
                    </button>

                    {/* Botón descartar */}
                    <button
                      onClick={() => setRecetaDetectada(null)}
                      className="w-full text-[#6e6e6e] hover:text-[#cccccc] text-xs py-1 transition-colors"
                    >
                      ✕ Descartar receta
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[#6e6e6e] text-xs">Esperando receta...</p>
                    <p className="text-[#4e4e4e] text-[10px] mt-1">Coloque archivo .sayer en la carpeta</p>
                  </div>
                )}
              </div>
            </aside>

            {/* Área principal - Display de peso */}
            <main className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] p-8">
              {/* Error Message */}
              {error && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-900/80 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Estado de báscula compacto */}
              <div className={`mb-6 px-4 py-2 rounded-full text-xs font-medium ${basculaConectada
                  ? "bg-green-900/30 text-green-400 border border-green-700/50"
                  : "bg-red-900/30 text-red-400 border border-red-700/50"
                }`}>
                {basculaConectada ? "● Báscula conectada" : "○ Báscula desconectada"}
              </div>

              {/* PESO GIGANTE - Elemento central */}
              <ScaleDisplay pesoActual={pesoActual} mezclando={mezclando} />
            </main>
          </div>

          {/* Footer estilo VS Code - Status bar */}
          <footer className="bg-[#007acc] px-3 py-0.5 flex items-center justify-between text-[11px] text-white">
            <div className="flex items-center gap-4">
              <span>◆ ColorManager v0.0.1</span>
              <span className="opacity-70">|</span>
              <span className="opacity-80">{mezclando ? "🔴 MEZCLA ACTIVA" : "⚪ Modo Espera"}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="opacity-80">Peso: {pesoActual.toFixed(1)}g</span>
              <span className="opacity-70">|</span>
              <span className="opacity-80">Báscula: {basculaConectada ? "OK" : "ERR"}</span>
              <span className="opacity-70">|</span>
              <span className="opacity-60">Build: FIX-20260130-02</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ModalProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ModalProvider>
  )
}
