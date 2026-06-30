import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound, AlertTriangle, ArrowLeft } from "lucide-react";

const inp = {
  padding:"11px 14px", border:"1.5px solid #e5e7eb", borderRadius:9,
  fontSize:14, outline:"none", color:"#111", width:"100%",
  boxSizing:"border-box", fontFamily:"sans-serif",
};

export default function PasswordResetRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name:"", email:"", contact:"", member_number:"" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function validate() {
    const e = {};
    if (!form.full_name.trim())    e.full_name    = "Required";
    if (!form.email.trim())        e.email        = "Required";
    if (!form.contact.trim())      e.contact      = "Required";
    if (!form.member_number.trim()) e.member_number = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setError(""); setLoading(true);

    // 1. Verify this matches a real member record before accepting the request
    const { data: matchedMember } = await supabase
      .from("members")
      .select("id, full_name, member_number, email, contact")
      .eq("member_number", form.member_number.trim())
      .maybeSingle();

    if (!matchedMember) {
      setLoading(false);
      setError("We couldn't find a member with that PeaceVyn ID. Please check and try again, or contact the office.");
      return;
    }

    // 2. Insert the password reset request
    const { error: insertError } = await supabase.from("password_reset_requests").insert([{
      member_id:     matchedMember.id,
      full_name:     form.full_name.trim(),
      email:         form.email.trim(),
      contact:       form.contact.trim(),
      member_number: form.member_number.trim(),
      status:        "pending",
    }]);

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }

    setSent(true);
  }

  if (sent) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <CheckCircle2 size={56} color="#15803d" style={{marginBottom:16}}/>
            <h2 style={{margin:"0 0 8px",fontSize:20,fontWeight:800,color:"#111",fontFamily:"Georgia, serif"}}>Request Sent!</h2>
            <p style={{fontSize:14,color:"#666",lineHeight:1.6,margin:"0 0 24px"}}>
              Your password reset request has been sent to the PeaceVyn admin team.
              They will contact you shortly with a new password.
            </p>
            <button onClick={()=>navigate("/login")} style={{
              background:"#800020",color:"#fff",border:"none",borderRadius:10,
              padding:"12px 28px",fontWeight:700,cursor:"pointer",fontSize:14,
              display:"flex",alignItems:"center",gap:8,margin:"0 auto",
            }}><ArrowLeft size={15}/> Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <KeyRound size={40} color="#800020" style={{marginBottom:8}}/>
          <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#111",fontFamily:"Georgia, serif"}}>Reset Your Password</h2>
          <p style={{fontSize:13,color:"#888",margin:0}}>
            Fill in the details you registered with PeaceVyn. Our team will verify and send you a new password.
          </p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={S.label}>Full Name <span style={{color:"#800020"}}>*</span></label>
            <input value={form.full_name} onChange={e=>set("full_name",e.target.value)}
              placeholder="As registered with PeaceVyn"
              style={{...inp,...(errors.full_name?{borderColor:"#dc2626"}:{})}}/>
            {errors.full_name && <span style={S.errText}>{errors.full_name}</span>}
          </div>

          <div>
            <label style={S.label}>PeaceVyn ID / Member Number <span style={{color:"#800020"}}>*</span></label>
            <input value={form.member_number} onChange={e=>set("member_number",e.target.value)}
              placeholder="e.g. PV-002"
              style={{...inp,...(errors.member_number?{borderColor:"#dc2626"}:{})}}/>
            {errors.member_number && <span style={S.errText}>{errors.member_number}</span>}
          </div>

          <div>
            <label style={S.label}>Email Address <span style={{color:"#800020"}}>*</span></label>
            <input type="email" value={form.email} onChange={e=>set("email",e.target.value)}
              placeholder="The email you registered with"
              style={{...inp,...(errors.email?{borderColor:"#dc2626"}:{})}}/>
            {errors.email && <span style={S.errText}>{errors.email}</span>}
          </div>

          <div>
            <label style={S.label}>Contact Number <span style={{color:"#800020"}}>*</span></label>
            <input value={form.contact} onChange={e=>set("contact",e.target.value)}
              placeholder="Your registered phone number"
              style={{...inp,...(errors.contact?{borderColor:"#dc2626"}:{})}}/>
            {errors.contact && <span style={S.errText}>{errors.contact}</span>}
          </div>

          {error && (
            <div style={{background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",display:"flex",alignItems:"center",gap:8}}>
              <AlertTriangle size={14}/> {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            background: loading ? "#c0606f" : "#800020", color:"#fff",
            border:"none", borderRadius:10, padding:"13px",
            fontWeight:800, fontSize:15, cursor: loading?"not-allowed":"pointer",
            marginTop:4,
          }}>
            {loading ? "Sending Request…" : "Send Reset Request"}
          </button>

          <button onClick={()=>navigate("/login")} style={{
            background:"none", border:"none", color:"#888",
            fontSize:13, cursor:"pointer", textAlign:"center", padding:"4px",
            display:"flex", alignItems:"center", gap:6, margin:"0 auto",
          }}>
            <ArrowLeft size={13}/> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight:"100vh",
    background:"linear-gradient(160deg,#0d0005 0%,#2a0010 40%,#800020 100%)",
    display:"flex", alignItems:"center", justifyContent:"center",
    padding:"20px", fontFamily:"sans-serif",
  },
  card: {
    background:"#fff", borderRadius:20, padding:"32px 28px",
    width:"100%", maxWidth:420, boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
  },
  label: { fontSize:12, fontWeight:700, color:"#555", display:"block", marginBottom:5 },
  errText: { fontSize:11, color:"#dc2626", marginTop:3, display:"block" },
};