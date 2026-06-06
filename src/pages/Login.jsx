import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
    }
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      {/* Background pattern */}
      <div style={styles.bgPattern} />

      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.logoMark}>P</div>
          <div>
            <h1 style={styles.brandName}>PeaceVyn</h1>
            <p style={styles.brandSub}>Community Savings & Credit</p>
          </div>
        </div>

        <div style={styles.divider} />

        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to access your dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => {
                e.target.style.borderColor = "#ddd";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => {
                e.target.style.borderColor = "#ddd";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.btn, ...styles.btnDisabled } : styles.btn}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Role info */}
        <div style={styles.roleInfo}>
          <div style={styles.roleCard}>
            <span style={{ ...styles.roleBadge, background: "#800020" }}>Admin</span>
            <span style={styles.roleDesc}>Full access — manage members, loans, savings &amp; fines</span>
          </div>
          <div style={styles.roleCard}>
            <span style={{ ...styles.roleBadge, background: "#2563eb" }}>Staff</span>
            <span style={styles.roleDesc}>View-only — reports and authorized information</span>
          </div>
        </div>

        <p style={styles.footer}>
          Your role is assigned by the administrator.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a0008 0%, #3d0015 50%, #800020 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  bgPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.03) 0%, transparent 50%)",
    pointerEvents: "none",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "40px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
    position: "relative",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px",
  },
  logoMark: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#800020",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: "800",
    fontFamily: "Georgia, serif",
    flexShrink: 0,
  },
  brandName: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "#1a0008",
    fontFamily: "Georgia, serif",
    letterSpacing: "-0.5px",
  },
  brandSub: {
    margin: 0,
    fontSize: "12px",
    color: "#888",
    fontFamily: "sans-serif",
  },
  divider: {
    height: "1px",
    background: "#f0f0f0",
    marginBottom: "24px",
  },
  title: {
    margin: "0 0 4px",
    fontSize: "20px",
    fontWeight: "700",
    color: "#111",
    fontFamily: "Georgia, serif",
  },
  subtitle: {
    margin: "0 0 24px",
    fontSize: "14px",
    color: "#666",
    fontFamily: "sans-serif",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#333",
    fontFamily: "sans-serif",
  },
  input: {
    padding: "10px 14px",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "sans-serif",
    color: "#111",
  },
  inputFocus: {
    borderColor: "#800020",
    boxShadow: "0 0 0 3px rgba(128,0,32,0.1)",
  },
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#dc2626",
    fontFamily: "sans-serif",
  },
  errorIcon: {
    marginRight: "6px",
  },
  btn: {
    background: "#800020",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "sans-serif",
    letterSpacing: "0.3px",
    transition: "background 0.2s",
    marginTop: "4px",
  },
  btnDisabled: {
    background: "#c0606f",
    cursor: "not-allowed",
  },
  roleInfo: {
    marginTop: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  roleCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    background: "#fafafa",
    borderRadius: "8px",
    border: "1px solid #f0f0f0",
  },
  roleBadge: {
    color: "#fff",
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "4px",
    fontFamily: "sans-serif",
    whiteSpace: "nowrap",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  roleDesc: {
    fontSize: "12px",
    color: "#555",
    fontFamily: "sans-serif",
  },
  footer: {
    marginTop: "16px",
    textAlign: "center",
    fontSize: "11px",
    color: "#aaa",
    fontFamily: "sans-serif",
  },
};
