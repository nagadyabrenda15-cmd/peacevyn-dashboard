import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt   = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));
const today = () => new Date().toISOString().split("T")[0];

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e5e7eb" }} />
        </div>
        <div style={{ padding: "12px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111", fontFamily: "Georgia, serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <div style={{ padding: "8px 20px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}{required && <span style={{ color: "#800020" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inp = {
  padding: "11px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10,
  fontSize: 15, outline: "none", color: "#111", background: "#fafafa",
  fontFamily: "sans-serif", width: "100%", boxSizing: "border-box",
};
const sel = { ...inp, cursor: "pointer" };

// ─── Balance Card ─────────────────────────────────────────────────────────────
function BalanceCard({ label, amount, icon, color, sub, locked }) {
  return (
    <div style={{
      background: locked ? "#f3f4f6" : `linear-gradient(135deg, ${color}, ${color}cc)`,
      borderRadius: 14, padding: "16px 18px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      opacity: locked ? 0.7 : 1,
    }}>
      <div>
        <div style={{ fontSize: 12, color: locked ? "#888" : "rgba(255,255,255,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: locked ? "#555" : "#fff", fontFamily: "Georgia, serif", marginTop: 4 }}>
          {locked ? "🔒 Subscribe" : `UGX ${fmt(amount)}`}
        </div>
        {sub && <div style={{ fontSize: 11, color: locked ? "#aaa" : "rgba(255,255,255,0.7)", marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 32, opacity: 0.3 }}>{icon}</div>
    </div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ icon, label, onClick, color = "#800020", disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      background: "#fff", border: "1.5px solid #f0e8ea", borderRadius: 12,
      padding: "14px 10px", cursor: disabled ? "not-allowed" : "pointer",
      flex: 1, opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>{icon}</div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#555", textAlign: "center" }}>{label}</span>
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: toast.type === "error" ? "#dc2626" : "#15803d",
      color: "#fff", padding: "12px 24px", borderRadius: 10,
      fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      whiteSpace: "nowrap",
    }}>
      {toast.type === "error" ? "⚠ " : "✓ "}{toast.msg}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function Badge({ text }) {
  const map = {
    pending:   ["#fef9c3", "#a16207"],
    approved:  ["#dcfce7", "#15803d"],
    confirmed: ["#dcfce7", "#15803d"],
    rejected:  ["#fee2e2", "#dc2626"],
    paid:      ["#eff6ff", "#1d4ed8"],
    active:    ["#dcfce7", "#15803d"],
    unpaid:    ["#fee2e2", "#dc2626"],
    deposit:   ["#dcfce7", "#15803d"],
    withdrawal:["#fee2e2", "#dc2626"],
    subscription:["#eff6ff","#1d4ed8"],
  };
  const [bg, fg] = map[text?.toLowerCase()] || ["#f3f4f6","#6b7280"];
  return (
    <span style={{ background:bg,color:fg,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,textTransform:"capitalize",whiteSpace:"nowrap" }}>
      {text||"—"}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: HOME
// ═══════════════════════════════════════════════════════════════════════════════
function HomeTab({ member, savings, loans, treatTx, welfare, packages }) {
  const savingsBalance = savings.reduce((a,s) => s.transaction_type!=="withdrawal" ? a+Number(s.amount) : a-Number(s.amount), 0);
  const activeLoan     = loans.find(l => l.loan_status === "approved");
  const loanBalance    = activeLoan ? Number(activeLoan.balance||0) : 0;

  // Treat — only non-subscription txs count for balance
  const treatDeposits  = treatTx.filter(t=>t.transaction_type!=="subscription");
  const isEnrolled     = treatTx.some(t=>t.transaction_type==="subscription");
  const treatBalance   = treatDeposits.length > 0 ? Number(treatDeposits[0].balance_after) : 0;
  const lastTreatTx    = treatDeposits[0];

  // Most recent savings tx
  const lastSavingsTx  = savings[0];

  // Welfare — check if paid this month
  const now            = new Date();
  const thisMonth      = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const paidThisMonth  = welfare.some(w => {
    const d = w.created_at || w.contribution_date || "";
    return d.startsWith(thisMonth);
  });

  const pkg = packages.find(p => p.id === member?.saving_package_id);

  return (
    <div style={{ padding: "0 0 16px" }}>
      {/* Welcome */}
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 16, padding: "20px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>Welcome back,</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, fontFamily: "Georgia, serif", marginTop: 2 }}>
            {member?.full_name?.split(" ")[0]} 👋
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 }}>
            {member?.member_number} · {pkg?.package_name || "—"}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: 600 }}>STATUS</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>
            {member?.member_status || "—"}
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Savings */}
        <div style={{ background: "linear-gradient(135deg,#800020,#b00030)", borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Savings Balance</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif", marginTop: 4 }}>UGX {fmt(savingsBalance)}</div>
            {lastSavingsTx ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
                Last: {lastSavingsTx.transaction_type} · {lastSavingsTx.saving_date || lastSavingsTx.created_at?.split("T")[0] || "—"}
              </div>
            ) : <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>No transactions yet</div>}
          </div>
          <div style={{ fontSize: 32, opacity: 0.3 }}>💰</div>
        </div>

        {/* Loan */}
        <div style={{ background: activeLoan ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#f9fafb", borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: activeLoan ? "none" : "1px dashed #e5e7eb" }}>
          <div>
            <div style={{ fontSize: 12, color: activeLoan ? "rgba(255,255,255,0.8)" : "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Active Loan</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: activeLoan ? "#fff" : "#555", fontFamily: "Georgia, serif", marginTop: 4 }}>
              {activeLoan ? `UGX ${fmt(loanBalance)}` : "No active loan"}
            </div>
            {activeLoan && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
                Due: {activeLoan.due_date} · Issued: {activeLoan.issue_date}
              </div>
            )}
          </div>
          <div style={{ fontSize: 32, opacity: 0.3 }}>📋</div>
        </div>

        {/* Treat */}
        {isEnrolled ? (
          <div style={{ background: "linear-gradient(135deg,#15803d,#166534)", borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Treat Account</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif", marginTop: 4 }}>UGX {fmt(treatBalance)}</div>
              {lastTreatTx ? (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
                  Last: {lastTreatTx.transaction_type} · {lastTreatTx.transaction_date || "—"}
                </div>
              ) : <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>No deposits yet</div>}
            </div>
            <div style={{ fontSize: 32, opacity: 0.3 }}>🏦</div>
          </div>
        ) : (
          <div style={{ background: "#f3f4f6", borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
            <div>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Treat Account</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#555", marginTop: 4 }}>🔒 Subscribe to activate</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>Pay UGX 5,000 to join</div>
            </div>
            <div style={{ fontSize: 32, opacity: 0.3 }}>🏦</div>
          </div>
        )}

        {/* Welfare */}
        <div style={{
          background: paidThisMonth ? "linear-gradient(135deg,#15803d,#166534)" : "linear-gradient(135deg,#dc2626,#b91c1c)",
          borderRadius: 14, padding: "16px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Welfare — This Month</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif", marginTop: 4 }}>
              {paidThisMonth ? "✓ Cleared" : "✗ Not Cleared"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
              {paidThisMonth ? "Welfare contribution paid" : "Welfare not yet paid this month"}
            </div>
          </div>
          <div style={{ fontSize: 32, opacity: 0.3 }}>🤝</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SAVINGS
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SAVINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SavingsTab({ member, savings, packages }) {
  const balance = savings.reduce((a,s) => s.transaction_type!=="withdrawal" ? a+Number(s.amount) : a-Number(s.amount), 0);
  const pkg     = packages.find(p => p.id === member?.saving_package_id);

  return (
    <div>
      {/* Balance hero */}
      <div style={{ background:"linear-gradient(135deg,#800020,#b00030)", borderRadius:16, padding:"20px", marginBottom:16 }}>
        <div style={{ color:"rgba(255,255,255,0.75)", fontSize:12, fontWeight:600, textTransform:"uppercase" }}>Savings Balance</div>
        <div style={{ color:"#fff", fontSize:28, fontWeight:800, fontFamily:"Georgia, serif", marginTop:4 }}>UGX {fmt(balance)}</div>
        {pkg && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:6 }}>{pkg.package_name} · Min: UGX {fmt(pkg.minimum_saving)}</div>}
      </div>

      {/* Transaction history */}
      <div style={{ fontSize:13,fontWeight:700,color:"#555",marginBottom:10 }}>Transaction History</div>
      {savings.length === 0 ? (
        <div style={{ textAlign:"center",padding:"32px 0",color:"#aaa" }}>
          <div style={{ fontSize:36,marginBottom:8 }}>💰</div>
          <p style={{ margin:0 }}>No savings transactions yet.</p>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {savings.map((s,i) => (
            <div key={i} style={{ background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:"#111",textTransform:"capitalize" }}>{s.transaction_type}</div>
                <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>
                  {s.saving_date || s.created_at?.split("T")[0] || "—"} · {s.payment_method||"—"}
                </div>
              </div>
              <div style={{ fontSize:15,fontWeight:800,color:s.transaction_type==="withdrawal"?"#dc2626":"#15803d" }}>
                {s.transaction_type==="withdrawal"?"−":"+"}UGX {fmt(s.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: LOAN
// ═══════════════════════════════════════════════════════════════════════════════
function LoanTab({ member, loans, loanRequests, onRefresh }) {
  const [showRequest, setShowRequest] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [form,        setForm]        = useState({ amount_requested:"", reason:"", repayment_period:"3 months" });
  const [error,       setError]       = useState("");

  const activeLoan    = loans.find(l => l.loan_status === "approved");
  const pendingReq    = loanRequests.filter(r => r.status === "pending");
  const hasActiveLoan = !!activeLoan;

  function showT(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3000); }

  async function handleRequest() {
    if (!form.amount_requested || Number(form.amount_requested) <= 0) { setError("Enter a valid amount"); return; }
    if (!form.reason.trim()) { setError("Please provide a reason"); return; }
    setSaving(true);
    const { error: err } = await supabase.from("loan_requests").insert([{
      member_id:        member.id,
      amount_requested: Number(form.amount_requested),
      reason:           form.reason,
      repayment_period: form.repayment_period,
      status:           "pending",
    }]);
    setSaving(false);
    if (err) { showT(err.message,"error"); return; }
    showT("Loan request submitted! Awaiting admin approval.");
    setShowRequest(false);
    setForm({amount_requested:"",reason:"",repayment_period:"3 months"});
    onRefresh();
  }

  return (
    <div>
      <Toast toast={toast} />

      {/* Active loan */}
      {activeLoan ? (
        <div style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", borderRadius:16, padding:"20px", marginBottom:16 }}>
          <div style={{ color:"rgba(255,255,255,0.75)",fontSize:12,fontWeight:600,textTransform:"uppercase" }}>Active Loan</div>
          <div style={{ color:"#fff",fontSize:26,fontWeight:800,fontFamily:"Georgia, serif",marginTop:4 }}>UGX {fmt(activeLoan.loan_amount)}</div>
          <div style={{ display:"flex",gap:16,marginTop:10,flexWrap:"wrap" }}>
            {[
              ["Total to Pay", `UGX ${fmt(activeLoan.total_amount_to_pay)}`],
              ["Paid",         `UGX ${fmt(activeLoan.amount_paid||0)}`],
              ["Balance",      `UGX ${fmt(activeLoan.balance||0)}`],
              ["Due Date",     activeLoan.due_date],
            ].map(([l,v],i)=>(
              <div key={i}>
                <div style={{color:"rgba(255,255,255,0.65)",fontSize:10,fontWeight:600,textTransform:"uppercase"}}>{l}</div>
                <div style={{color:"#fff",fontSize:13,fontWeight:700,marginTop:1}}>{v}</div>
              </div>
            ))}
          </div>
          {/* Repayment progress */}
          <div style={{marginTop:14}}>
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:4,height:6}}>
              <div style={{
                width:`${activeLoan.total_amount_to_pay>0?Math.min(100,Math.round((Number(activeLoan.amount_paid||0)/Number(activeLoan.total_amount_to_pay))*100)):0}%`,
                height:6,borderRadius:4,background:"#fff",
              }}/>
            </div>
            <div style={{color:"rgba(255,255,255,0.7)",fontSize:11,marginTop:4}}>
              {activeLoan.total_amount_to_pay>0?Math.min(100,Math.round((Number(activeLoan.amount_paid||0)/Number(activeLoan.total_amount_to_pay))*100)):0}% repaid
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background:"#f9fafb",borderRadius:16,padding:"20px",textAlign:"center",marginBottom:16,border:"1px dashed #e5e7eb" }}>
          <div style={{fontSize:36,marginBottom:8}}>📋</div>
          <div style={{fontSize:15,fontWeight:600,color:"#555"}}>No active loan</div>
          <div style={{fontSize:12,color:"#aaa",marginTop:4}}>Request a loan below</div>
        </div>
      )}

      {/* Pending requests */}
      {pendingReq.length > 0 && (
        <div style={{background:"#fef9c3",borderRadius:10,padding:"12px 14px",marginBottom:14,border:"1px solid #fde68a"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#a16207",marginBottom:6}}>⏳ Pending Requests</div>
          {pendingReq.map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#555",marginBottom:4}}>
              <span>UGX {fmt(r.amount_requested)} · {r.repayment_period}</span>
              <Badge text={r.status} />
            </div>
          ))}
        </div>
      )}

      {!hasActiveLoan && (
        <button onClick={() => setShowRequest(true)} style={{
          width:"100%",background:"#2563eb",color:"#fff",border:"none",
          borderRadius:12,padding:"14px",fontWeight:700,cursor:"pointer",fontSize:15,marginBottom:20,
        }}>+ Request a Loan</button>
      )}

      {/* Loan history */}
      <div style={{fontSize:13,fontWeight:700,color:"#555",marginBottom:10}}>Loan History</div>
      {loans.length === 0 ? (
        <div style={{textAlign:"center",padding:"24px 0",color:"#aaa",fontSize:13}}>No loan history.</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {loans.map((l,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #f3f4f6"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:15,fontWeight:800,color:"#111"}}>UGX {fmt(l.loan_amount)}</div>
                <Badge text={l.loan_status} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12,color:"#888"}}>
                <span>Interest: {l.interest_rate}%</span>
                <span>Total: UGX {fmt(l.total_amount_to_pay)}</span>
                <span>Paid: UGX {fmt(l.amount_paid||0)}</span>
                <span>Due: {l.due_date||"—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loan requests history */}
      {loanRequests.length > 0 && (
        <>
          <div style={{fontSize:13,fontWeight:700,color:"#555",margin:"16px 0 10px"}}>My Requests</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {loanRequests.map((r,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#111"}}>UGX {fmt(r.amount_requested)}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:2}}>{r.reason} · {r.repayment_period}</div>
                  {r.admin_notes && <div style={{fontSize:11,color:"#800020",marginTop:2}}>Note: {r.admin_notes}</div>}
                </div>
                <Badge text={r.status} />
              </div>
            ))}
          </div>
        </>
      )}

      {showRequest && (
        <Modal title="Request a Loan" onClose={() => setShowRequest(false)}>
          <Field label="Amount Requested (UGX)" required>
            <input type="number" min="0" placeholder="0" value={form.amount_requested}
              onChange={e=>{setForm(f=>({...f,amount_requested:e.target.value}));setError("");}} style={inp} />
            {error && <span style={{fontSize:11,color:"#dc2626"}}>{error}</span>}
          </Field>
          <Field label="Repayment Period">
            <select value={form.repayment_period} onChange={e=>setForm(f=>({...f,repayment_period:e.target.value}))} style={sel}>
              {["1 month","2 months","3 months","6 months","12 months"].map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Reason for Loan" required>
            <textarea rows={3} placeholder="Briefly explain why you need this loan…" value={form.reason}
              onChange={e=>{setForm(f=>({...f,reason:e.target.value}));setError("");}} style={{...inp,resize:"vertical"}} />
          </Field>
          <div style={{background:"#eff6ff",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#1d4ed8"}}>
            ℹ️ Your request will be reviewed and approved by the admin.
          </div>
          <button onClick={handleRequest} disabled={saving} style={{width:"100%",background:saving?"#93c5fd":"#2563eb",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:15}}>
            {saving?"Submitting…":"Submit Loan Request"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: TREAT
// ═══════════════════════════════════════════════════════════════════════════════
function TreatTab({ member, treatTx, treatRequests, onRefresh }) {
  const [showRequest, setShowRequest] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [form,        setForm]        = useState({ amount:"", reason:"" });
  const [error,       setError]       = useState("");

  const isEnrolled   = treatTx.length > 0;
  const balance      = isEnrolled ? Number(treatTx[0].balance_after) : 0;
  const accountNum   = isEnrolled ? treatTx[0].account_number : null;
  const pendingReqs  = treatRequests.filter(r => r.status === "pending");
  const totalDeposits    = treatTx.filter(t=>t.transaction_type==="deposit").reduce((a,t)=>a+Number(t.amount),0);
  const totalWithdrawals = treatTx.filter(t=>t.transaction_type==="withdrawal").reduce((a,t)=>a+Number(t.amount),0);

  function showT(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3000); }

  async function handleWithdrawRequest() {
    if (!form.amount || Number(form.amount) <= 0) { setError("Enter a valid amount"); return; }
    if (Number(form.amount) > balance)             { setError(`Cannot exceed balance of UGX ${fmt(balance)}`); return; }
    setSaving(true);
    const { error: err } = await supabase.from("treat_requests").insert([{
      member_id:      member.id,
      account_number: accountNum,
      amount:         Number(form.amount),
      reason:         form.reason || null,
      status:         "pending",
    }]);
    setSaving(false);
    if (err) { showT(err.message,"error"); return; }
    showT("Withdrawal request submitted!");
    setShowRequest(false);
    setForm({amount:"",reason:""});
    onRefresh();
  }

  if (!isEnrolled) {
    return (
      <div style={{ textAlign:"center", padding:"40px 20px" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
        <h3 style={{ margin:"0 0 8px", fontSize:18, fontWeight:800, color:"#111", fontFamily:"Georgia, serif" }}>
          The Treat Account
        </h3>
        <p style={{ fontSize:14, color:"#555", lineHeight:1.6, margin:"0 0 8px" }}>
          The Treat is PeaceVyn's emergency flexible savings account.
          Deposit and withdraw <strong>anytime, any day</strong> — no restrictions.
        </p>
        <div style={{ background:"#fff5f7",borderRadius:12,padding:"16px",border:"1px solid #f9e0e4",marginBottom:20,textAlign:"left" }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#800020",marginBottom:8 }}>To activate your account:</div>
          <div style={{ fontSize:13,color:"#555",display:"flex",flexDirection:"column",gap:6 }}>
            <span>✓ Pay a one-time annual subscription of <strong>UGX 5,000</strong></span>
            <span>✓ Contact the admin or treasurer to enrol</span>
            <span>✓ Your account will be activated immediately</span>
          </div>
        </div>
        <div style={{ background:"#f3f4f6",borderRadius:10,padding:"12px",fontSize:12,color:"#888" }}>
          Once enrolled, your Treat balance and transaction history will appear here.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} />

      {/* Balance hero */}
      <div style={{ background:"linear-gradient(135deg,#15803d,#166534)",borderRadius:16,padding:"20px",marginBottom:16 }}>
        <div style={{ color:"rgba(255,255,255,0.75)",fontSize:12,fontWeight:600,textTransform:"uppercase" }}>Treat Balance</div>
        <div style={{ color:"#fff",fontSize:28,fontWeight:800,fontFamily:"Georgia, serif",marginTop:4 }}>UGX {fmt(balance)}</div>
        <div style={{ color:"rgba(255,255,255,0.7)",fontSize:12,marginTop:6 }}>{accountNum}</div>
        <div style={{ display:"flex",gap:16,marginTop:10 }}>
          <div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:10,fontWeight:600,textTransform:"uppercase"}}>Deposited</div>
            <div style={{color:"#fff",fontSize:13,fontWeight:700}}>UGX {fmt(totalDeposits)}</div>
          </div>
          <div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:10,fontWeight:600,textTransform:"uppercase"}}>Withdrawn</div>
            <div style={{color:"#fff",fontSize:13,fontWeight:700}}>UGX {fmt(totalWithdrawals)}</div>
          </div>
        </div>
      </div>

      {/* Pending requests */}
      {pendingReqs.length > 0 && (
        <div style={{background:"#fef9c3",borderRadius:10,padding:"12px 14px",marginBottom:14,border:"1px solid #fde68a"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#a16207",marginBottom:6}}>⏳ Pending Withdrawal Requests</div>
          {pendingReqs.map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#555",marginBottom:4}}>
              <span>UGX {fmt(r.amount)}</span>
              <Badge text={r.status} />
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowRequest(true)} disabled={balance<=0} style={{
        width:"100%",background:balance<=0?"#e5e7eb":"#15803d",
        color:balance<=0?"#aaa":"#fff",border:"none",
        borderRadius:12,padding:"14px",fontWeight:700,
        cursor:balance<=0?"not-allowed":"pointer",fontSize:15,marginBottom:20,
      }}>📤 Request Withdrawal</button>

      {/* Transaction history */}
      <div style={{fontSize:13,fontWeight:700,color:"#555",marginBottom:10}}>Transaction History</div>
      {treatTx.length === 0 ? (
        <div style={{textAlign:"center",padding:"24px 0",color:"#aaa",fontSize:13}}>No transactions yet.</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {treatTx.map((t,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#111",textTransform:"capitalize",display:"flex",alignItems:"center",gap:6}}>
                  {t.transaction_type==="withdrawal"?"📤":t.transaction_type==="subscription"?"🔑":"📥"} {t.transaction_type}
                </div>
                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{t.transaction_date} · Bal: UGX {fmt(t.balance_after)}</div>
              </div>
              <div style={{fontSize:15,fontWeight:800,color:t.transaction_type==="withdrawal"?"#dc2626":"#15803d"}}>
                {t.transaction_type==="withdrawal"?"−":"+"}UGX {fmt(t.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showRequest && (
        <Modal title="Request Withdrawal" onClose={() => setShowRequest(false)}>
          <div style={{background:"#f0fdf4",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,color:"#15803d",fontWeight:600}}>
            Available Balance: UGX {fmt(balance)}
          </div>
          <Field label="Amount to Withdraw (UGX)" required>
            <input type="number" min="0" max={balance} placeholder="0" value={form.amount}
              onChange={e=>{setForm(f=>({...f,amount:e.target.value}));setError("");}} style={inp} />
            {error && <span style={{fontSize:11,color:"#dc2626"}}>{error}</span>}
          </Field>
          <Field label="Reason (optional)">
            <textarea rows={2} placeholder="Why do you need this withdrawal?" value={form.reason}
              onChange={e=>setForm(f=>({...f,reason:e.target.value}))} style={{...inp,resize:"vertical"}} />
          </Field>
          <div style={{background:"#fff5f7",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#800020"}}>
            ℹ️ Your withdrawal request will be processed by the admin.
          </div>
          <button onClick={handleWithdrawRequest} disabled={saving} style={{width:"100%",background:saving?"#86efac":"#15803d",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:15}}>
            {saving?"Submitting…":"Submit Request"}
          </button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ member, packages, onSignOut }) {
  const pkg = packages.find(p => p.id === member?.saving_package_id);

  const initials = member?.full_name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";

  const rows = [
    ["Member Number",  member?.member_number],
    ["Gender",         member?.gender],
    ["Date of Birth",  member?.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : "—"],
    ["Contact",        member?.contact],
    ["Email",          member?.email || "—"],
    ["Address",        member?.address],
    ["National ID",    member?.national_id_number || "—"],
    ["Next of Kin",    member?.next_of_kin_name],
    ["NOK Contact",    member?.next_of_kin_contact],
    ["Saving Package", pkg?.package_name || "—"],
    ["Status",         member?.member_status],
    ["Member Since",   member?.created_at ? new Date(member.created_at).toLocaleDateString() : "—"],
  ];

  return (
    <div>
      {/* Profile hero with big avatar */}
      <div style={{ background:"linear-gradient(135deg,#800020,#b00030)", borderRadius:16, padding:"24px 20px", marginBottom:16, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
        {/* Avatar */}
        <div style={{
          width:80, height:80, borderRadius:"50%",
          background:"rgba(255,255,255,0.25)",
          border:"3px solid rgba(255,255,255,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontWeight:900, fontSize:30, color:"#fff",
          marginBottom:12, letterSpacing:1,
          boxShadow:"0 4px 16px rgba(0,0,0,0.2)",
        }}>
          {initials}
        </div>
        <div style={{ color:"#fff", fontSize:20, fontWeight:800, fontFamily:"Georgia, serif" }}>{member?.full_name}</div>
        <div style={{ color:"rgba(255,255,255,0.75)", fontSize:13, marginTop:4 }}>{member?.member_number}</div>
        <div style={{ marginTop:8, display:"flex", gap:8 }}>
          <span style={{ background:"rgba(255,255,255,0.2)", color:"#fff", fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:99, textTransform:"capitalize" }}>
            {member?.member_status}
          </span>
          {pkg && (
            <span style={{ background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:99 }}>
              📦 {pkg.package_name}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div style={{ fontSize:13, fontWeight:700, color:"#555", marginBottom:10 }}>Personal Details</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"#f3f4f6", borderRadius:10, overflow:"hidden", marginBottom:20 }}>
        {rows.map(([label,val],i) => (
          <div key={i} style={{ background:"#fff", padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:0.4, marginBottom:2 }}>{label}</div>
            <div style={{ fontSize:13, color:"#111", fontWeight:500 }}>{val||"—"}</div>
          </div>
        ))}
      </div>

      <button onClick={onSignOut} style={{
        width:"100%", background:"#fff", color:"#800020",
        border:"2px solid #800020", borderRadius:12,
        padding:"13px", fontWeight:700, cursor:"pointer", fontSize:15,
      }}>🚪 Sign Out</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MEMBER PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function MemberPortal() {
  const { user, signOut } = useAuth();
  const [tab,      setTab]      = useState("home");
  const [member,   setMember]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Data
  const [savings,       setSavings]       = useState([]);
  const [loans,         setLoans]         = useState([]);
  const [loanRequests,  setLoanRequests]  = useState([]);
  const [treatTx,       setTreatTx]       = useState([]);
  const [treatRequests, setTreatRequests] = useState([]);
  const [welfare,       setWelfare]       = useState([]);
  const [packages,      setPackages]      = useState([]);
  const [pendingDeposits, setPendingDeposits] = useState([]);

  useEffect(() => { if (user) loadAll(); }, [user]);

  async function loadAll() {
    setLoading(true);

    // Get member record linked to this auth user
    const { data: memberData } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!memberData) { setLoading(false); return; }
    setMember(memberData);

    const mid = memberData.id;
    const [sv, ln, lnReq, tr, trReq, wf, pk, pd] = await Promise.all([
      supabase.from("savings").select("*").eq("member_id", mid).order("created_at",{ascending:false}),
      supabase.from("loans").select("*").eq("members_id", mid).order("issue_date",{ascending:false}),
      supabase.from("loan_requests").select("*").eq("member_id", mid).order("created_at",{ascending:false}),
      supabase.from("treat").select("*").eq("member_id", mid).order("created_at",{ascending:false}),
      supabase.from("treat_requests").select("*").eq("member_id", mid).order("created_at",{ascending:false}),
      supabase.from("welfare_contributions").select("*").eq("member_id", mid),
      supabase.from("saving_packages").select("*"),
      supabase.from("savings_deposits").select("*").eq("member_id", mid).order("created_at",{ascending:false}),
    ]);

    setSavings(sv.data        || []);
    setLoans(ln.data          || []);
    setLoanRequests(lnReq.data || []);
    setTreatTx(tr.data        || []);
    setTreatRequests(trReq.data || []);
    setWelfare(wf.data        || []);
    setPackages(pk.data       || []);
    setPendingDeposits(pd.data || []);
    setLoading(false);
  }

  const tabs = [
    { key:"home",    icon:"🏠", label:"Home"    },
    { key:"savings", icon:"💰", label:"Savings" },
    { key:"loan",    icon:"📋", label:"Loan"    },
    { key:"treat",   icon:"🏦", label:"Treat"   },
    { key:"profile", icon:"👤", label:"Profile" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff" }}>
        <div style={{ width:36,height:36,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
        <p style={{ color:"#800020",fontFamily:"Georgia, serif",marginTop:12 }}>Loading your portal…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",padding:24,textAlign:"center" }}>
        <div style={{ fontSize:48,marginBottom:16 }}>⚠️</div>
        <h3 style={{ color:"#800020",fontFamily:"Georgia, serif",margin:"0 0 8px" }}>Account Not Linked</h3>
        <p style={{ color:"#666",fontSize:14,margin:"0 0 20px" }}>Your login is not linked to a member record. Please contact the admin.</p>
        <button onClick={signOut} style={{ background:"#800020",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontWeight:700,cursor:"pointer",fontSize:14 }}>Sign Out</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:480,margin:"0 auto",background:"#f8f7f5",minHeight:"100vh",position:"relative",fontFamily:"sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        input:focus,select:focus,textarea:focus{border-color:#800020!important;box-shadow:0 0 0 3px rgba(128,0,32,0.08);outline:none;}
      `}</style>

      {/* ── Top bar */}
      <div style={{ background:"#800020",padding:"14px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100 }}>
        <div>
          <div style={{ color:"rgba(255,255,255,0.75)",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>PeaceVyn</div>
          <div style={{ color:"#fff",fontSize:14,fontWeight:700 }}>{member.full_name}</div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#fff",fontWeight:700 }}>
          {member.member_number}
        </div>
      </div>

      {/* ── Tab content */}
      <div style={{ padding:"16px 16px 80px" }}>
        {tab === "home"    && <HomeTab    member={member} savings={savings} loans={loans} treatTx={treatTx} welfare={welfare} packages={packages} />}
        {tab === "savings" && <SavingsTab member={member} savings={savings} packages={packages} />}
        {tab === "loan"    && <LoanTab    member={member} loans={loans} loanRequests={loanRequests} onRefresh={loadAll} />}
        {tab === "treat"   && <TreatTab   member={member} treatTx={treatTx} treatRequests={treatRequests} onRefresh={loadAll} />}
        {tab === "profile" && <ProfileTab member={member} packages={packages} onSignOut={signOut} />}
      </div>

      {/* ── Bottom nav */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,
        background:"#fff",borderTop:"1px solid #f0f0f0",
        display:"flex",zIndex:100,
        boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",
      }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",
            gap:3,padding:"10px 4px 12px",border:"none",
            background:"none",cursor:"pointer",
            borderTop: tab===t.key ? "2.5px solid #800020" : "2.5px solid transparent",
          }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:10,fontWeight:700,color:tab===t.key?"#800020":"#aaa",letterSpacing:0.3 }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

