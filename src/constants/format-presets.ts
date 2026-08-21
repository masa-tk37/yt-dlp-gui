export const FORMAT_PRESET_MP4 = "mp4-preset"
export const FORMAT_PRESET_AUDIO = "audio"
// `[ext=mp4]` alone lets AV1 through — some sources ship it in mp4 — and AV1 plays on
// Apple devices only with a hardware decoder, so the avc1/mp4a pins come first.
// HLS-only sources report `acodec: none` and `ext: mp4` for audio and offer no muxed
// format, missing every pinned rung; the `ba[ext=mp4]` and `bv*+ba` rungs catch that.
export const MP4_FORMAT_STRING =
  "bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*[vcodec^=avc1]+ba[ext=mp4]/bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b"
