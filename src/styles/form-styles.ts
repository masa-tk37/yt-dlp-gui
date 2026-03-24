export const formInput: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-input)",
  border: "1.5px solid var(--border)",
  borderRadius: 12,
  padding: "11px 16px",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  transition: "border-color 0.15s, box-shadow 0.15s",
}

export const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "var(--text-muted)",
  marginBottom: 6,
  letterSpacing: "0.02em",
}

export const toolLabelStyle: React.CSSProperties = {
  ...fieldLabel,
  fontSize: 11,
  letterSpacing: "0.06em",
  minWidth: 60,
  marginBottom: 0,
}

export const toolRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "var(--text-sec)",
}

export const sectionCard: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1.5px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "20px 22px",
  boxShadow: "var(--shadow-card)",
}
