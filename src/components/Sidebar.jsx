import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function Sidebar() {
  const [open,    setOpen]    = useState(false);
  const [pending, setPending] = useState(0);
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadPending() {
    const [ln, dp, tr] = await Promise.all([
      supabase.from("loan_requests").select("id",{count:"exact"}).eq("status","pending"),
      supabase.from("savings_deposits").select("id",{count:"exact"}).eq("status","pending"),
      supabase.from("treat_requests").select("id",{count:"exact"}).eq("status","pending"),
    ]);
    setPending((ln.count||0)+(dp.count||0)+(tr.count||0));
  }

  const navItems = [
    { to:"/",         label:"Dashboard",  icon:"📊" },
    { to:"/members",  label:"Members",    icon:"👥" },
    { to:"/savings",  label:"Savings",    icon:"💰" },
    { to:"/loans",    label:"Loans",      icon:"📋" },
    { to:"/fines",    label:"Fines",      icon:"⚠️" },
    { to:"/packages", label:"Packages",   icon:"📦" },
    { to:"/welfare",  label:"Welfare",    icon:"🤝" },
    { to:"/treat",    label:"The Treat",  icon:"🏦" },
    { to:"/reports",  label:"Reports",    icon:"📊" },
    { to:"/requests", label:"Requests",   icon:"📬", badge: pending },
  ];

  return (
    <div style={{
      width: open ? "220px" : "70px", transition: "width 0.3s",
      background: "#0b0b0b", color: "white",
      minHeight: "100vh", padding: "12px 10px",
      display: "flex", flexDirection: "column",
      justifyContent: "space-between", flexShrink: 0,
    }}>
      <div>
        {/* Toggle + brand */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          {open && <span style={{ color:"#800020", fontWeight:800, fontSize:16, fontFamily:"Georgia, serif" }}>PeaceVyn</span>}
          <button onClick={() => setOpen(!open)} style={{ background:"#800020",border:"none",color:"white",padding:"6px 10px",borderRadius:6,cursor:"pointer",marginLeft:"auto" }}>☰</button>
        </div>

        {/* Role badge */}
        {open && role && (
          <div style={{ marginBottom:14, padding:"3px 10px", background: role==="admin"?"#800020":"#1e3a8a", borderRadius:4, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, display:"inline-block" }}>
            {role}
          </div>
        )}

        {/* Nav links */}
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} style={{
                textDecoration:"none", color:"white",
                background: isActive ? "#800020" : "#1a1a1a",
                padding:"10px", borderRadius:8,
                textAlign: open ? "left" : "center",
                display:"flex", alignItems:"center",
                gap: open ? 10 : 0, justifyContent: open ? "flex-start" : "center",
                fontSize:13, fontWeight: isActive ? 700 : 400,
                position:"relative",
              }}>
                <span style={{ fontSize:18 }}>{item.icon}</span>
                {open && <span style={{ flex:1 }}>{item.label}</span>}
                {item.badge > 0 && (
                  <span style={{ background:"#dc2626", color:"#fff", fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:99, position: open?"relative":"absolute", top: open?0:-4, right: open?0:-4 }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ borderTop:"1px solid #222", paddingTop:12 }}>
        {open && user && (
          <p style={{ fontSize:11,color:"#888",margin:"0 0 8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
            {user.email}
          </p>
        )}
        <button onClick={signOut} title="Sign out" style={{ width:"100%",background:"#1a1a1a",border:"1px solid #333",color:"#ccc",padding:"8px",borderRadius:6,cursor:"pointer",fontSize:13,textAlign:open?"left":"center" }}>
          {open ? "🚪 Sign Out" : "🚪"}
        </button>
      </div>
    </div>
  );
}
