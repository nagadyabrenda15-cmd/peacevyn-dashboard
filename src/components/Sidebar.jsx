import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  return (
    <div style={{
      width: open ? "220px" : "70px",
      transition: "0.3s",
      background: "#0b0b0b",
      color: "white",
      minHeight: "100vh",
      padding: "10px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div>
        {/* TOP BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#800020", display: open ? "block" : "none", margin: 0 }}>
            PeaceVyn
          </h3>
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: "#800020",
              border: "none",
              color: "white",
              padding: "5px 10px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            ☰
          </button>
        </div>

        {/* Role badge */}
        {open && role && (
          <div style={{
            marginTop: "10px",
            padding: "4px 8px",
            background: role === "admin" ? "#800020" : "#1e3a8a",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            display: "inline-block",
          }}>
            {role}
          </div>
        )}

        {/* MENU */}
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <Nav open={open} to="/" label="Dashboard" icon="📊" />
          <Nav open={open} to="/members" label="Members" icon="👥" />
          <Nav open={open} to="/savings" label="Savings" icon="💰" />
          <Nav open={open} to="/loans" label="Loans" icon="📋" />
          <Nav open={open} to="/fines" label="Fines" icon="⚠️" />
          <Nav open={open} to="/welfare" label="Welfare" icon="🤝" />
          <Nav open={open} to="/packages" label="Packages" icon="📦" />
          <Nav open={open} to="/treat" label="The Treat" icon="🏦" />
          <Nav open={open} to="/reports" label="Reports" icon="📊" />
        </div>
      </div>

      {/* BOTTOM: user info + logout */}
      <div style={{ borderTop: "1px solid #222", paddingTop: "12px" }}>
        {open && user && (
          <p style={{
            fontSize: "11px",
            color: "#888",
            margin: "0 0 8px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {user.email}
          </p>
        )}
        <button
          onClick={signOut}
          title="Sign out"
          style={{
            width: "100%",
            background: "#1a1a1a",
            border: "1px solid #333",
            color: "#ccc",
            padding: "8px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            textAlign: open ? "left" : "center",
          }}
        >
          {open ? "🚪 Sign Out" : "🚪"}
        </button>
      </div>
    </div>
  );
}

function Nav({ open, to, label, icon }) {
  return (
    <Link to={to} style={{
      textDecoration: "none",
      color: "white",
      background: "#1a1a1a",
      padding: "10px",
      borderRadius: "8px",
      textAlign: open ? "left" : "center",
      display: "block",
    }}>
      {open ? `${icon} ${label}` : icon}
    </Link>
  );
}

