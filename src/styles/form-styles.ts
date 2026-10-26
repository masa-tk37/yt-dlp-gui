export const textField: React.CSSProperties = {
  width: "100%",
  height: 28,
  background: "var(--content-bg)",
  border: "0.5px solid var(--separator)",
  borderRadius: "var(--radius-control)",
  padding: "0 8px",
  color: "var(--label)",
  boxShadow: "inset 0 0.5px 1px rgba(0, 0, 0, 0.06)",
}

export const pushButton: React.CSSProperties = {
  height: 28,
  padding: "0 14px",
  background: "var(--fill)",
  border: "none",
  borderRadius: "var(--radius-control)",
  color: "var(--label)",
  fontWeight: 500,
  whiteSpace: "nowrap",
}

export function prominentButton(disabled = false): React.CSSProperties {
  return {
    ...pushButton,
    background: disabled ? "var(--fill)" : "var(--accent)",
    color: disabled ? "var(--tertiary-label)" : "#fff",
  }
}

export const iconButton: React.CSSProperties = {
  width: 28,
  height: 28,
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-capsule)",
  color: "var(--label)",
}

export const toolbarCapsule: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: 32,
  background: "var(--fill)",
  borderRadius: "var(--radius-capsule)",
}

export const groupBox: React.CSSProperties = {
  background: "var(--content-bg)",
  borderRadius: "var(--radius-group)",
  boxShadow: "var(--group-shadow)",
}

export const groupHeading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--label)",
  margin: "0 4px 6px",
}

export const formRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  minHeight: 44,
  padding: "8px 14px",
}

export const rowDivider: React.CSSProperties = {
  height: 0.5,
  background: "var(--separator)",
  marginLeft: 14,
}

export const secondaryText: React.CSSProperties = {
  fontSize: 11,
  color: "var(--secondary-label)",
}

export const truncate: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}
