import { useEffect, useState } from "react"
import { api } from "../api/client"
import type { DependencyStatus } from "../types"

export function useTauriBackend() {
  const [error, setError] = useState<string | null>(null)
  const [dependencies, setDependencies] = useState<DependencyStatus | null>(
    null,
  )

  useEffect(() => {
    api.dependencies
      .status()
      .then(setDependencies)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return { error, dependencies }
}
