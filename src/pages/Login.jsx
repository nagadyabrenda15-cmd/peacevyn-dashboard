import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, KeyRound, AlertTriangle } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setError("");
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      // Detect first-time / password related errors
      if (
        signInError.message.includes("Email not confirmed") ||
        signInError.message.includes("Invalid login") ||
        signInError.message.includes("invalid_credentials")
      ) {
        setError("Invalid email or password. Please check your credentials.");
      } else {
        setError(signInError.message);
      }
    }
    setLoading(false);
  }

  return (
    <div style={S.page}>
      {/* Decorative circles */}
      <div style={S.circle1} />
      <div style={S.circle2} />
      <div style={S.circle3} />

      <div style={S.card}>

        {/* ── Logo */}
        <div style={S.logoWrap}>
          <img
            src="/logo-stacked.png"
            alt="PeaceVyn Investments"
            style={S.logoImg}
            onError={e => { e.target.style.display="none"; }}
          />
          {/* Fallback text logo if image missing */}
          <div style={S.logoFallback}>
            <div style={S.logoInitial}>PV</div>
            <div>
              <div style={S.logoName}>PeaceVyn</div>
              <div style={S.logoSub}>Investments</div>
            </div>
          </div>
        </div>

        {/* ── Slogan */}
        <div style={S.slogan}>
          "Listen to the Sounds of Success"
        </div>

        <div style={S.divider} />

        {/* ── Toggle first time / returning */}
        <div style={S.toggleRow}>
          <button
            onClick={()=>setIsFirstTime(false)}
            style={{...S.toggleBtn, ...(isFirstTime ? {} : S.toggleBtnActive)}}
          >
            Returning User
          </button>
          <button
            onClick={()=>setIsFirstTime(true)}
            style={{...S.toggleBtn, ...(isFirstTime ? S.toggleBtnActive : {})}}
          >
            First Time Login
          </button>
        </div>

        {/* ── Context message */}
        {isFirstTime ? (
          <div style={S.infoBox}>
            <LogIn size={20} color="#800020" style={{flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontWeight:700,color:"#800020",marginBottom:2}}>Welcome to PeaceVyn!</div>
              <div style={{fontSize:12,color:"#555",lineHeight:1.5}}>
                Use the email and temporary password provided by your administrator.
                You can change your password after logging in from your profile.
              </div>
            </div>
          </div>
        ) : (
          <div style={{marginBottom:20}}>
            <h2 style={S.title}>Welcome back</h2>
            <p style={S.subtitle}>Sign in to access your account</p>
          </div>
        )}

        {/* ── Form */}
        <div style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com"
              style={S.input}
              onFocus={e=>{e.target.style.borderColor="#800020";e.target.style.boxShadow="0 0 0 3px rgba(128,0,32,0.1)";}}
              onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{position:"relative"}}>
              <input
                type={showPass?"text":"password"}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                style={{...S.input, paddingRight:44}}
                onFocus={e=>{e.target.style.borderColor="#800020";e.target.style.boxShadow="0 0 0 3px rgba(128,0,32,0.1)";}}
                onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";}}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              />
              <button
                onClick={()=>setShowPass(s=>!s)}
                style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#888",padding:0,display:"flex"}}
              >
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          {error && (
            <div style={S.errorBox}>
              <AlertTriangle size={14} style={{marginRight:6,flexShrink:0}}/>{error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{...S.btn, ...(loading?S.btnDisabled:{})}}
          >
            {loading
              ? <span>Signing in…</span>
              : <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {isFirstTime ? <KeyRound size={16}/> : <LogIn size={16}/>}
                  {isFirstTime ? "Login for the First Time" : "Sign In"}
                </span>
            }
          </button>
        </div>

        {/* ── Footer */}
        <p style={S.footer}>
          Forgot your password?{" "}
          <span
            onClick={()=>navigate("/forgot-password")}
            style={{color:"#800020",fontWeight:700,cursor:"pointer",textDecoration:"underline"}}
          >
            Request a reset
          </span>
        </p>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight:"100vh",
    background:"linear-gradient(160deg,#0d0005 0%,#2a0010 40%,#800020 100%)",
    display:"flex", alignItems:"center", justifyContent:"center",
    padding:"20px", position:"relative", overflow:"hidden",
    fontFamily:"sans-serif",
  },
  circle1: {
    position:"absolute", width:400, height:400, borderRadius:"50%",
    background:"rgba(255,255,255,0.03)", top:-100, right:-100, pointerEvents:"none",
  },
  circle2: {
    position:"absolute", width:300, height:300, borderRadius:"50%",
    background:"rgba(255,255,255,0.02)", bottom:-80, left:-80, pointerEvents:"none",
  },
  circle3: {
    position:"absolute", width:200, height:200, borderRadius:"50%",
    background:"rgba(255,255,255,0.03)", top:"40%", left:"10%", pointerEvents:"none",
  },
  card: {
    background:"#fff", borderRadius:20, padding:"36px 32px",
    width:"100%", maxWidth:420,
    boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
    position:"relative",
  },
  logoWrap: {
    display:"flex", justifyContent:"center", marginBottom:4,
    flexDirection:"column", alignItems:"center",
  },
  logoImg: {
    width:180, height:"auto", marginBottom:4,
    objectFit:"contain",
  },
  logoFallback: {
    display:"none", // hidden when image loads; shown via onError above
    alignItems:"center", gap:12,
  },
  logoInitial: {
    width:52, height:52, borderRadius:12, background:"#800020",
    color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:900, fontSize:20, fontFamily:"Georgia, serif", flexShrink:0,
  },
  logoName: {
    fontSize:24, fontWeight:900, color:"#1a0008",
    fontFamily:"Georgia, serif", letterSpacing:-0.5,
  },
  logoSub: {
    fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:2,
  },
  slogan: {
    textAlign:"center", fontSize:12, color:"#800020",
    fontStyle:"italic", fontFamily:"Georgia, serif",
    marginBottom:16, letterSpacing:0.3,
  },
  divider: {
    height:1, background:"linear-gradient(90deg,transparent,#f0e8ea,transparent)",
    marginBottom:20,
  },
  toggleRow: {
    display:"flex", background:"#f8f7f5", borderRadius:10,
    padding:4, marginBottom:20, gap:4,
  },
  toggleBtn: {
    flex:1, padding:"9px 0", border:"none", borderRadius:8,
    background:"transparent", color:"#888", fontWeight:600,
    cursor:"pointer", fontSize:13, transition:"all 0.2s",
  },
  toggleBtnActive: {
    background:"#800020", color:"#fff",
    boxShadow:"0 2px 8px rgba(128,0,32,0.3)",
  },
  infoBox: {
    display:"flex", gap:10, background:"#fff5f7",
    borderRadius:10, padding:"12px 14px",
    border:"1px solid #f9c0c0", marginBottom:20,
  },
  title: {
    margin:"0 0 4px", fontSize:20, fontWeight:800,
    color:"#111", fontFamily:"Georgia, serif",
  },
  subtitle: {
    margin:0, fontSize:14, color:"#888",
  },
  form: {
    display:"flex", flexDirection:"column", gap:14,
  },
  field: {
    display:"flex", flexDirection:"column", gap:6,
  },
  label: {
    fontSize:13, fontWeight:700, color:"#444",
  },
  input: {
    padding:"11px 14px", border:"1.5px solid #e5e7eb",
    borderRadius:9, fontSize:14, outline:"none",
    color:"#111", width:"100%", boxSizing:"border-box",
    fontFamily:"sans-serif", transition:"border-color 0.2s, box-shadow 0.2s",
  },
  errorBox: {
    background:"#fff5f5", border:"1px solid #fca5a5",
    borderRadius:8, padding:"10px 14px",
    fontSize:13, color:"#dc2626",
  },
  btn: {
    background:"linear-gradient(135deg,#800020,#b00030)",
    color:"#fff", border:"none", borderRadius:10,
    padding:"13px", fontSize:15, fontWeight:800,
    cursor:"pointer", letterSpacing:0.3,
    boxShadow:"0 4px 16px rgba(128,0,32,0.35)",
    marginTop:4, transition:"opacity 0.2s",
  },
  btnDisabled: {
    opacity:0.65, cursor:"not-allowed",
  },
  footer: {
    marginTop:20, textAlign:"center",
    fontSize:11, color:"#bbb", lineHeight:1.5,
  },
};