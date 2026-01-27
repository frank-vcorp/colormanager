/**
 * Main Renderer Entry Point
 * ID Intervención: IMPL-20260127-01
 */

import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { setupBrowserMock } from "./mock-ipc"

// Activar mock si no estamos en Electron
setupBrowserMock()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
