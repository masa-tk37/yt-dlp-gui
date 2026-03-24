import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const host = process.env.TAURI_DEV_HOST
const tauriConf = JSON.parse(
  readFileSync(resolve(__dirname, "src-tauri/tauri.conf.json"), "utf-8"),
)
const appVersion: string = tauriConf.version
const appName: string = tauriConf.productName

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_NAME__: JSON.stringify(appName),
  },
  clearScreen: false,
  server: {
    host: host || true,
    port: 5173,
    strictPort: true,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["TAURI_ENV_*"],
  optimizeDeps: {
    include: ["@tauri-apps/api/core", "@tauri-apps/api/event"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "safari13", // macOS-only: Tauri uses WebKit
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
