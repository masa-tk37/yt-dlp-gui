# yt-dlp GUI

A desktop GUI for [yt-dlp](https://github.com/yt-dlp/yt-dlp).  
Fetches metadata from video or playlist URLs and manages downloads in a queue.

## Features

- Download single videos and playlists
- Format selection (video+audio / audio only)
- Download queue with real-time progress
- Configurable output directory, concurrency, and playlist item limit

## Requirements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [ffmpeg](https://ffmpeg.org/)

Both are auto-detected from PATH on launch. An error screen is shown if either is missing.

## Development

### Prerequisites

- [Bun](https://bun.sh/) 1.x
- [Rust](https://www.rust-lang.org/) (stable)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/): `cargo install tauri-cli --version "^2"`

### Run

```bash
bun install
bun dev
```

### Build

```bash
bun run build
```

### Test & Type Check

```bash
bun run test
bun type-check
```

## Tech Stack

- **Frontend**: React 19 + Vite 8 + TypeScript 6
- **Backend**: Rust + Tauri v2
- **IPC**: Tauri invoke (no REST API)
- **Process management**: yt-dlp as a child process, stdout JSON parsing
- **Linter / Formatter**: Biome
