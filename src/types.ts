export type JobStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed"
  | "cancelled"

export const TERMINAL_STATUSES = new Set<JobStatus>([
  "completed",
  "failed",
  "cancelled",
])

export interface Job {
  id: string
  url: string
  title?: string
  formatId?: string
  audioOnly: boolean
  status: JobStatus
  progress?: number
  speed?: string
  eta?: string
  filesize?: number
  filename?: string
  error?: string
  createdAt: string
  completedAt?: string
  phase?: string
}

export interface DownloadProgress {
  jobId: string
  status: JobStatus
  progress: number
  speed: string
  eta: string
  filename: string
  totalBytes?: number
  totalBytesEstimate?: number
  downloadedBytes?: number
  phase?: string
  error?: string
}

export interface Format {
  formatId: string
  ext: string
  resolution?: string
  filesize?: number
  vcodec?: string
  acodec?: string
  note?: string
}

export interface VideoInfo {
  title: string
  formats: Format[]
  isPlaylist: boolean
  entries?: PlaylistEntry[]
}

export interface PlaylistEntry {
  url: string
  title: string
  duration?: number
}

export interface Settings {
  outputDir: string
  maxConcurrent: number
  maxPlaylistItems: number
}

export interface ToolInfo {
  version: string
  path: string
}

export interface DependencyStatus {
  backendReady: boolean
  ytdlp: ToolInfo | null
  ffmpeg: ToolInfo | null
}
