import { PiTrayArrowDown } from "react-icons/pi"
import { groupBox, groupHeading } from "../styles/form-styles"
import type { Job } from "../types"
import { DownloadItem } from "./DownloadItem"

interface DownloadQueueProps {
  jobs: Job[]
  onCancel: (jobId: string) => void
}

export function DownloadQueue({ jobs, onCancel }: DownloadQueueProps) {
  if (jobs.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          textAlign: "center",
          color: "var(--secondary-label)",
          paddingBottom: "var(--toolbar-height)",
        }}
      >
        <PiTrayArrowDown size={44} style={{ color: "var(--tertiary-label)" }} />
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--label)" }}>
          No Downloads
        </div>
        <div>Paste a link in the toolbar to get started.</div>
      </div>
    )
  }

  return (
    <section>
      <h2 style={groupHeading}>Downloads</h2>
      <div style={{ ...groupBox, overflow: "hidden" }}>
        {jobs.map((job, i) => (
          <DownloadItem
            key={job.id}
            job={job}
            isLast={i === jobs.length - 1}
            onCancel={onCancel}
          />
        ))}
      </div>
    </section>
  )
}
