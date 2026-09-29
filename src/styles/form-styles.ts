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

export const sectionTitle: React.CSSProperties = {
  fontFamily: '"Fredoka", sans-serif',
  fontSize: 16,
  color: "var(--text-sec)",
  letterSpacing: "0.02em",
}

export function primaryButton(disabled = false): React.CSSProperties {
  return {
    background: disabled ? "var(--border)" : "var(--primary)",
    border: "none",
    borderRadius: "var(--radius-pill)",
    color: disabled ? "var(--text-muted)" : "#fff",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.18s cubic-bezier(0.34, 1.3, 0.64, 1)",
    boxShadow: disabled ? "none" : "0 4px 14px var(--primary-glow)",
  }
}
