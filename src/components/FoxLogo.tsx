import foxLogoSrc from "../assets/fox-logo.png"

interface Props {
  size?: number
}

export function FoxLogo({ size = 28 }: Props) {
  return (
    <img
      src={foxLogoSrc}
      width={size}
      height={size}
      alt=""
      style={{ display: "inline-block", flexShrink: 0 }}
    />
  )
}
