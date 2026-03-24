import { listen } from "@tauri-apps/api/event"
import { useCallback, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Job, DownloadProgress } from "../types"
import { TERMINAL_STATUSES } from "../types"

type UnlistenFn = () => void

export function useJobSubscriptions(setJobs: Dispatch<SetStateAction<Job[]>>) {
  const unlistenRef = useRef<UnlistenFn | null>(null)

  const startListening = useCallback(async () => {
    if (unlistenRef.current) return

    const unlisten = await listen<DownloadProgress>(
      "download-progress",
      (event) => {
        const progress = event.payload
        setJobs((prev) =>
          prev.map((j) => {
            if (j.id !== progress.jobId) return j
            const isPhaseOnly = progress.phase != null
            return {
              ...j,
              status: progress.status,
              progress: isPhaseOnly ? j.progress : progress.progress,
              speed: progress.speed || j.speed,
              eta: progress.eta || j.eta,
              filename: progress.filename || j.filename,
              phase: isPhaseOnly ? progress.phase : undefined,
              error: progress.error ?? j.error,
            }
          }),
        )
      },
    )

    unlistenRef.current = unlisten
  }, [setJobs])

  const stopListening = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current()
      unlistenRef.current = null
    }
  }, [])

  const applySnapshot = useCallback(
    (jobList: Job[]) => {
      setJobs((prev) => {
        const existing = new Map(prev.map((j) => [j.id, j]))
        const merged = jobList.map((j) => existing.get(j.id) ?? j)
        // keep optimistic jobs not yet in snapshot
        const snapshotIds = new Set(jobList.map((j) => j.id))
        const optimistic = prev.filter(
          (j) => !snapshotIds.has(j.id) && !TERMINAL_STATUSES.has(j.status),
        )
        return [...optimistic, ...merged]
      })
    },
    [setJobs],
  )

  return { startListening, stopListening, applySnapshot }
}
