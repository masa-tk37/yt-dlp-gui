import { useState, useEffect, useCallback } from "react"
import { api } from "../api/client"
import type { Job } from "../types"
import { TERMINAL_STATUSES } from "../types"
import { useJobSubscriptions } from "./useJobSubscriptions"

export function useDownloads() {
  const [jobs, setJobs] = useState<Job[]>([])
  const { startListening, stopListening, applySnapshot } =
    useJobSubscriptions(setJobs)

  useEffect(() => {
    let isDisposed = false

    const init = async () => {
      await startListening()
      const jobList = await api.downloads.getAll()
      if (isDisposed) return
      applySnapshot(jobList)
    }

    void init()

    return () => {
      isDisposed = true
      stopListening()
    }
  }, [startListening, stopListening, applySnapshot])

  const addDownload = useCallback(
    async (
      url: string,
      formatId?: string,
      audioOnly?: boolean,
      title?: string,
    ) => {
      const job = await api.downloads.add(url, formatId, audioOnly, title)
      setJobs((prev) => [...prev, job])
    },
    [],
  )

  const addBulkDownloads = useCallback(
    async (
      urls: string[],
      formatId?: string,
      audioOnly?: boolean,
      titles?: string[],
    ) => {
      const newJobs = await api.downloads.addBulk(
        urls,
        formatId,
        audioOnly,
        titles,
      )
      setJobs((prev) => [...prev, ...newJobs])
    },
    [],
  )

  const cancelDownload = useCallback(async (jobId: string) => {
    await api.downloads.cancel(jobId)
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: "cancelled" as const } : j,
      ),
    )
  }, [])

  const cancelAllDownloads = useCallback(async () => {
    await api.downloads.cancelAll()
    setJobs((prev) =>
      prev.map((j) =>
        TERMINAL_STATUSES.has(j.status)
          ? j
          : { ...j, status: "cancelled" as const },
      ),
    )
  }, [])

  const clearCompleted = useCallback(async () => {
    await api.downloads.clearCompleted()
    setJobs((prev) => prev.filter((j) => !TERMINAL_STATUSES.has(j.status)))
  }, [])

  return {
    jobs,
    addDownload,
    addBulkDownloads,
    cancelDownload,
    cancelAllDownloads,
    clearCompleted,
  }
}
