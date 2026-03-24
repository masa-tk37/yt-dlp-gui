import { invoke as tauriInvoke } from "@tauri-apps/api/core"
import type { Job, VideoInfo, Settings } from "../types"

function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>(cmd, args)
}

export const api = {
  downloads: {
    add: (
      url: string,
      formatId?: string,
      audioOnly?: boolean,
      title?: string,
    ): Promise<Job> =>
      invoke("add_download", { url, formatId, audioOnly, title }),

    addBulk: (
      urls: string[],
      formatId?: string,
      audioOnly?: boolean,
      titles?: string[],
    ): Promise<Job[]> =>
      invoke("add_bulk_downloads", { urls, formatId, audioOnly, titles }),

    getAll: (): Promise<Job[]> => invoke("get_all_jobs"),

    cancel: (id: string): Promise<void> => invoke("cancel_download", { id }),

    cancelAll: (): Promise<number> => invoke("cancel_all_downloads"),

    clearCompleted: (): Promise<number> => invoke("clear_completed"),
  },

  formats: {
    list: (url: string): Promise<VideoInfo> => invoke("list_formats", { url }),
  },

  settings: {
    get: (): Promise<Settings> => invoke("get_settings"),
    update: (
      outputDir?: string,
      maxConcurrent?: number,
      maxPlaylistItems?: number,
    ): Promise<Settings> =>
      invoke("update_settings", { outputDir, maxConcurrent, maxPlaylistItems }),
  },
}
