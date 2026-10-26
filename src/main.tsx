import { getCurrentWindow } from "@tauri-apps/api/window"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { App } from "./App"
import { SettingsWindow } from "./components/SettingsWindow"

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Root element not found")

const isSettings = getCurrentWindow().label === "settings"

createRoot(rootEl).render(
  <StrictMode>{isSettings ? <SettingsWindow /> : <App />}</StrictMode>,
)
