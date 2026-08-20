export const FORMAT_PRESET_MP4 = "mp4-preset"
export const FORMAT_PRESET_AUDIO = "audio"
// `[ext=mp4]` alone lets AV1 through (YouTube ships it in mp4), and AV1 plays on
// Apple devices only with a hardware decoder — hence the avc1/mp4a pins first.
export const MP4_FORMAT_STRING =
  "bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b"
