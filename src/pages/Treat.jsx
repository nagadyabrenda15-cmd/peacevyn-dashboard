import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const TX_TYPES      = ["deposit", "withdrawal", "subscription"];
const PAY_METHODS   = ["cash", "mobile_money", "bank_transfer", "cheque", "other"];
const SUBSCRIPTION_FEE = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt   = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));
const today = () => new Date().toISOString().split("T")[0];

function genAccountNumber(memberNumber) {
  return `TRT-${memberNumber || String(Date.now()).slice(-4)}`;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ text }) {
  const map = {
    deposit:      ["#dcfce7", "#15803d"],
    withdrawal:   ["#fee2e2", "#dc2626"],
    subscription: ["#eff6ff", "#1d4ed8"],
  };
  const [bg, fg] = map[text?.toLowerCase()] || ["#f3f4f6", "#6b7280"];
  return (
    <span style={{
      background: bg, color: fg, fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 99, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>{text || "—"}</span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "16px 18px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderLeft: `4px solid ${accent}`,
      display: "flex", gap: 14, alignItems: "center",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: `${accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111", fontFamily: "Georgia, serif" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: "1px solid #f0f0f0",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
          borderRadius: "16px 16px 0 0",
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111", fontFamily: "Georgia, serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}{required && <span style={{ color: "#800020" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inp = {
  padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8,
  fontSize: 14, outline: "none", color: "#111", background: "#fafafa",
  fontFamily: "sans-serif", width: "100%", boxSizing: "border-box",
};
const sel = { ...inp, cursor: "pointer" };

// ─── Enrol Form ───────────────────────────────────────────────────────────────
function EnrolForm({ members, existingMemberIds, onSave, onCancel, saving }) {
  const available = members.filter(m => !existingMemberIds.has(m.id));
  const [memberId,  setMemberId]  = useState("");
  const [method,    setMethod]    = useState("cash");
  const [reference, setReference] = useState("");
  const [notes,     setNotes]     = useState("");
  const [error,     setError]     = useState("");

  function handleSave() {
    if (!memberId) { setError("Please select a member"); return; }
    const member = members.find(m => m.id === Number(memberId));
    onSave({
      member_id:        Number(memberId),
      account_number:   genAccountNumber(member?.member_number),
      transaction_type: "subscription",
      amount:           SUBSCRIPTION_FEE,
      balance_after:    SUBSCRIPTION_FEE, // first tx = subscription fee as opening
      payment_method:   method,
      reference,
      notes:            notes || "Initial 5,000 UGX subscription fee",
      transaction_date: today(),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Info banner */}
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 10, padding: "14px 18px", color: "#fff",
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🏦 Enrol in The Treat</div>
        <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
          A one-time annual subscription of <strong>UGX 5,000</strong> is required to activate the account.
          Members can deposit and withdraw freely at any time after enrolment.
        </div>
      </div>

      <Field label="Select Member" required>
        <select value={memberId} onChange={e => { setMemberId(e.target.value); setError(""); }}
          style={{ ...sel, ...(error ? { borderColor: "#dc2626" } : {}) }}>
          <option value="">— Select member —</option>
          {available.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
        </select>
        {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}
        {available.length === 0 && <span style={{ fontSize: 11, color: "#888" }}>All active members are already enrolled.</span>}
      </Field>

      <Field label="Subscription Fee">
        <input type="text" value="UGX 5,000 (fixed)" readOnly
          style={{ ...inp, background: "#f3f4f6", color: "#800020", fontWeight: 700 }} />
      </Field>

      <Field label="Payment Method">
        <select value={method} onChange={e => setMethod(e.target.value)} style={sel}>
          {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
        </select>
      </Field>

      <Field label="Reference">
        <input type="text" placeholder="Receipt / ref number" value={reference}
          onChange={e => setReference(e.target.value)} style={inp} />
      </Field>

      <Field label="Notes">
        <textarea rows={2} placeholder="Optional…" value={notes}
          onChange={e => setNotes(e.target.value)} style={{ ...inp, resize: "vertical" }} />
      </Field>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding:"10px 20px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#555",fontWeight:600,cursor:"pointer",fontSize:14 }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ padding:"10px 24px",borderRadius:8,border:"none",background:saving?"#c0606f":"#800020",color:"#fff",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:14 }}>
          {saving ? "Enrolling…" : "Enrol & Pay Subscription"}
        </button>
      </div>
    </div>
  );
}

// ─── Transaction Form (Deposit / Withdrawal) ──────────────────────────────────
function TransactionForm({ account, memberName, currentBalance, txType, onSave, onCancel, saving }) {
  const [amount,    setAmount]    = useState("");
  const [method,    setMethod]    = useState("cash");
  const [reference, setReference] = useState("");
  const [date,      setDate]      = useState(today());
  const [notes,     setNotes]     = useState("");
  const [error,     setError]     = useState("");

  const isWithdrawal = txType === "withdrawal";
  const newBalance   = isWithdrawal
    ? currentBalance - (Number(amount) || 0)
    : currentBalance + (Number(amount) || 0);

  function handleSave() {
    const amt = Number(amount);
    if (!amt || amt <= 0)               { setError("Enter a valid amount"); return; }
    if (isWithdrawal && amt > currentBalance) { setError(`Cannot exceed balance of UGX ${fmt(currentBalance)}`); return; }
    onSave({
      member_id:        account.member_id,
      account_number:   account.account_number,
      transaction_type: txType,
      amount:           amt,
      balance_after:    Math.max(0, newBalance),
      payment_method:   method,
      reference,
      notes,
      transaction_date: date,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${isWithdrawal ? "#dc2626" : "#15803d"}, ${isWithdrawal ? "#b91c1c" : "#166534"})`,
        borderRadius: 10, padding: "14px 18px", color: "#fff",
      }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>{memberName} · {account.account_number}</div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Georgia, serif" }}>
          {isWithdrawal ? "Withdrawal" : "Deposit"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
          Current Balance: <strong>UGX {fmt(currentBalance)}</strong>
        </div>
      </div>

      <Field label={`Amount to ${isWithdrawal ? "Withdraw" : "Deposit"} (UGX)`} required>
        <input type="number" min="0" placeholder="0" value={amount}
          onChange={e => { setAmount(e.target.value); setError(""); }}
          style={{ ...inp, ...(error ? { borderColor: "#dc2626" } : {}) }} />
        {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}
        {amount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: newBalance < 0 ? "#dc2626" : "#15803d" }}>
            New balance will be: UGX {fmt(Math.max(0, newBalance))}
          </span>
        )}
      </Field>

      <Field label="Payment Method">
        <select value={method} onChange={e => setMethod(e.target.value)} style={sel}>
          {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
        </select>
      </Field>

      <Field label="Date" required>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
      </Field>

      <Field label="Reference">
        <input type="text" placeholder="Receipt / ref number" value={reference}
          onChange={e => setReference(e.target.value)} style={inp} />
      </Field>

      <Field label="Notes">
        <textarea rows={2} placeholder="Optional…" value={notes}
          onChange={e => setNotes(e.target.value)} style={{ ...inp, resize: "vertical" }} />
      </Field>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding:"10px 20px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#555",fontWeight:600,cursor:"pointer",fontSize:14 }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          padding:"10px 24px",borderRadius:8,border:"none",
          background: saving ? "#aaa" : isWithdrawal ? "#dc2626" : "#15803d",
          color:"#fff",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:14,
        }}>{saving ? "Processing…" : isWithdrawal ? "Withdraw" : "Deposit"}</button>
      </div>
    </div>
  );
}

// ─── Member Ledger Modal ──────────────────────────────────────────────────────
function MemberLedger({ account, memberName, transactions, onClose, onDeposit, onWithdraw, isAdmin }) {
  const currentBalance = transactions.length > 0
    ? Number(transactions[0].balance_after)
    : 0;
  const lastSub = transactions.find(t => t.transaction_type === "subscription");
  const totalDeposits    = transactions.filter(t => t.transaction_type === "deposit").reduce((a, t) => a + Number(t.amount), 0);
  const totalWithdrawals = transactions.filter(t => t.transaction_type === "withdrawal").reduce((a, t) => a + Number(t.amount), 0);

  return (
    <Modal title={`${memberName} — Treat Account`} onClose={onClose}>
      {/* Hero balance */}
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 12, padding: "18px 22px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Current Balance</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Georgia, serif", marginTop: 4 }}>
            UGX {fmt(currentBalance)}
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6 }}>
            {account.account_number} · Sub: {lastSub ? "✓ Paid" : "✗ Unpaid"}
          </div>
        </div>
        <div style={{ fontSize: 40, opacity: 0.2 }}>🏦</div>
      </div>

      {/* Mini stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Deposits", value: `UGX ${fmt(totalDeposits)}`, color: "#15803d", bg: "#f0fdf4" },
          { label: "Withdrawals", value: `UGX ${fmt(totalWithdrawals)}`, color: "#dc2626", bg: "#fef2f2" },
          { label: "Transactions", value: transactions.length, color: "#800020", bg: "#fff5f7" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={onDeposit} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "none",
            background: "#15803d", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}>📥 Deposit</button>
          <button onClick={onWithdraw} disabled={currentBalance <= 0} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "none",
            background: currentBalance <= 0 ? "#e5e7eb" : "#dc2626",
            color: currentBalance <= 0 ? "#aaa" : "#fff",
            fontWeight: 700, cursor: currentBalance <= 0 ? "not-allowed" : "pointer", fontSize: 14,
          }}>📤 Withdraw</button>
        </div>
      )}

      {/* Transaction history */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        Transaction History
      </div>
      {transactions.length === 0 ? (
        <p style={{ color: "#aaa", textAlign: "center", fontSize: 13 }}>No transactions yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {transactions.map((t, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", background: "#fafafa", borderRadius: 8,
              border: "1px solid #f3f4f6",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: t.transaction_type === "withdrawal" ? "#fee2e2" : t.transaction_type === "subscription" ? "#eff6ff" : "#dcfce7",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                }}>
                  {t.transaction_type === "withdrawal" ? "📤" : t.transaction_type === "subscription" ? "🔑" : "📥"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111", textTransform: "capitalize" }}>{t.transaction_type}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{t.transaction_date} {t.reference ? `· ${t.reference}` : ""}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: t.transaction_type === "withdrawal" ? "#dc2626" : "#15803d" }}>
                  {t.transaction_type === "withdrawal" ? "−" : "+"}UGX {fmt(t.amount)}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>Bal: UGX {fmt(t.balance_after)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TREAT PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Treat() {
  const { role } = useAuth();
  const isAdmin  = role === "admin";

  const [transactions, setTransactions] = useState([]);
  const [members,      setMembers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page,       setPage]       = useState(1);
  const PER_PAGE = 12;

  const [showEnrol,     setShowEnrol]     = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState(null);
  const [depositFor,    setDepositFor]    = useState(null);
  const [withdrawFor,   setWithdrawFor]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [txRes, mbRes] = await Promise.all([
      supabase.from("treat").select("*").order("created_at", { ascending: false }),
      supabase.from("members").select("id, full_name, member_number, member_status"),
    ]);
    setTransactions(txRes.data || []);
    setMembers(mbRes.data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleEnrol(form) {
    setSaving(true);
    const { error } = await supabase.from("treat").insert([form]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Member enrolled in The Treat!");
    setShowEnrol(false);
    loadAll();
  }

  async function handleTransaction(form) {
    setSaving(true);
    const { error } = await supabase.from("treat").insert([form]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast(`${form.transaction_type === "withdrawal" ? "Withdrawal" : "Deposit"} recorded!`);
    setDepositFor(null);
    setWithdrawFor(null);
    setLedgerAccount(null);
    loadAll();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("treat").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Record deleted.");
    setConfirmDelete(null);
    loadAll();
  }

  // ── Per-member computed values
  const getMemberName   = (id) => members.find(m => m.id === id)?.full_name     || `Member #${id}`;
  const getMemberNumber = (id) => members.find(m => m.id === id)?.member_number  || "";

  // Get unique enrolled members (by account_number per member_id)
  const enrolledMap = {};
  transactions.forEach(t => {
    if (!enrolledMap[t.member_id]) {
      enrolledMap[t.member_id] = {
        member_id:      t.member_id,
        account_number: t.account_number,
      };
    }
  });
  const enrolledAccounts = Object.values(enrolledMap);
  const existingMemberIds = new Set(enrolledAccounts.map(a => a.member_id));

  const getBalance = (memberId) => {
    const txs = transactions.filter(t => t.member_id === memberId);
    return txs.length > 0 ? Number(txs[0].balance_after) : 0;
  };

  const getMemberTx = (memberId) => transactions.filter(t => t.member_id === memberId);

  const hasSubscription = (memberId) =>
    transactions.some(t => t.member_id === memberId && t.transaction_type === "subscription");

  // ── KPIs
  const totalFund        = enrolledAccounts.reduce((a, acc) => a + getBalance(acc.member_id), 0);
  const totalEnrolled    = enrolledAccounts.length;
  const totalDeposits    = transactions.filter(t => t.transaction_type === "deposit").reduce((a, t) => a + Number(t.amount), 0);
  const totalWithdrawals = transactions.filter(t => t.transaction_type === "withdrawal").reduce((a, t) => a + Number(t.amount), 0);
  const subsPaid         = enrolledAccounts.filter(a => hasSubscription(a.member_id)).length;
  const subRevenue       = transactions.filter(t => t.transaction_type === "subscription").reduce((a, t) => a + Number(t.amount), 0);

  // ── Filter transactions table
  const filtered = transactions.filter(t => {
    const q    = search.toLowerCase();
    const name = getMemberName(t.member_id).toLowerCase();
    const num  = getMemberNumber(t.member_id).toLowerCase();
    const matchSearch = !q || name.includes(q) || num.includes(q) ||
      t.account_number?.toLowerCase().includes(q) ||
      t.reference?.toLowerCase().includes(q) ||
      String(t.amount).includes(q);
    const matchType = typeFilter === "all" || t.transaction_type === typeFilter;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div style={{ background: "#f8f7f5", minHeight: "100vh", padding: "20px 16px", fontFamily: "sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "error" ? "#dc2626" : "#15803d",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease",
        }}>
          {toast.type === "error" ? "⚠ " : "✓ "}{toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from{transform:translateX(40px);opacity:0;}to{transform:translateX(0);opacity:1;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        tr:hover td { background:#fff9f9 !important; }
        input:focus,select:focus,textarea:focus { border-color:#800020 !important; box-shadow:0 0 0 3px rgba(128,0,32,0.08); outline:none; }
      `}</style>

      {/* ── Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#800020", fontFamily:"Georgia, serif" }}>
            The Treat 🏦
          </h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#888" }}>
            Emergency flexible savings — deposit &amp; withdraw anytime · {totalEnrolled} members enrolled
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowEnrol(true)} style={{
            background:"#800020", color:"#fff", border:"none",
            borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14,
          }}>+ Enrol Member</button>
        )}
      </div>

      {/* ── KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))", gap:12, marginBottom:20 }}>
        <KPICard icon="🏦" label="Total Fund"       value={`UGX ${fmt(totalFund)}`}       sub="combined balances"           accent="#800020" />
        <KPICard icon="👥" label="Enrolled"          value={totalEnrolled}                  sub="active treat members"        accent="#2563eb" />
        <KPICard icon="📥" label="Total Deposited"  value={`UGX ${fmt(totalDeposits)}`}    sub="all-time deposits"           accent="#15803d" />
        <KPICard icon="📤" label="Total Withdrawn"  value={`UGX ${fmt(totalWithdrawals)}`} sub="all-time withdrawals"        accent="#dc2626" />
        <KPICard icon="🔑" label="Subscriptions"    value={`UGX ${fmt(subRevenue)}`}       sub={`${subsPaid} fees collected` } accent="#7e22ce" />
      </div>

      {/* ── Enrolled Accounts Cards */}
      {enrolledAccounts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:"#111" }}>
            Member Accounts
          </h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
            {enrolledAccounts.map(acc => {
              const balance = getBalance(acc.member_id);
              const subPaid = hasSubscription(acc.member_id);
              const lastTx  = getMemberTx(acc.member_id)[0];
              return (
                <div key={acc.member_id} style={{
                  background:"#fff", borderRadius:12,
                  boxShadow:"0 2px 10px rgba(0,0,0,0.06)",
                  border:"1px solid #f3e8ea", overflow:"hidden",
                }}>
                  <div style={{ background:"linear-gradient(135deg,#800020,#b00030)", padding:"12px 16px" }}>
                    <div style={{ color:"rgba(255,255,255,0.75)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>
                      {acc.account_number}
                    </div>
                    <div style={{ color:"#fff", fontWeight:800, fontSize:15, marginTop:2 }}>
                      {getMemberName(acc.member_id)}
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, marginTop:2 }}>
                      {getMemberNumber(acc.member_id)}
                    </div>
                  </div>
                  <div style={{ padding:"12px 16px" }}>
                    <div style={{ fontSize:22, fontWeight:800, color:"#800020", marginBottom:4 }}>
                      UGX {fmt(balance)}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <span style={{
                        fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:99,
                        background: subPaid ? "#dcfce7" : "#fee2e2",
                        color: subPaid ? "#15803d" : "#dc2626",
                      }}>
                        {subPaid ? "✓ Subscribed" : "✗ Not Subscribed"}
                      </span>
                      {lastTx && (
                        <span style={{ fontSize:11, color:"#aaa" }}>
                          {lastTx.transaction_date}
                        </span>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => setLedgerAccount(acc)} style={{
                        flex:1, padding:"7px", borderRadius:7, border:"1px solid #e5e7eb",
                        background:"#fff", color:"#555", fontWeight:600, cursor:"pointer", fontSize:12,
                      }}>📋 Ledger</button>
                      {isAdmin && (
                        <>
                          <button onClick={() => setDepositFor(acc)} style={{
                            flex:1, padding:"7px", borderRadius:7, border:"none",
                            background:"#dcfce7", color:"#15803d", fontWeight:700, cursor:"pointer", fontSize:12,
                          }}>📥</button>
                          <button onClick={() => setWithdrawFor(acc)} disabled={balance<=0} style={{
                            flex:1, padding:"7px", borderRadius:7, border:"none",
                            background: balance<=0 ? "#f3f4f6" : "#fee2e2",
                            color: balance<=0 ? "#ccc" : "#dc2626",
                            fontWeight:700, cursor:balance<=0?"not-allowed":"pointer", fontSize:12,
                          }}>📤</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transactions Table */}
      <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:"#111" }}>All Transactions</h3>

      {/* Filters */}
      <div style={{
        background:"#fff", borderRadius:12, padding:"12px 16px",
        boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:14,
        display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
      }}>
        <div style={{ position:"relative", flex:"1 1 200px" }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }}>🔍</span>
          <input placeholder="Search member, account, reference…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inp, paddingLeft:32 }} />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          style={{ ...sel, flex:"0 1 150px" }}>
          <option value="all">All Types</option>
          {TX_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        {(search || typeFilter !== "all") && (
          <button onClick={() => { setSearch(""); setTypeFilter("all"); setPage(1); }}
            style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize:13, color:"#888", whiteSpace:"nowrap" }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:48, textAlign:"center" }}>
            <div style={{ width:32,height:32,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px" }} />
            <p style={{ color:"#aaa", margin:0 }}>Loading transactions…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding:"52px 20px", textAlign:"center" }}>
            <div style={{ fontSize:42, marginBottom:10 }}>🏦</div>
            <p style={{ color:"#888", margin:0, fontSize:15 }}>No transactions yet.</p>
            {isAdmin && <button onClick={() => setShowEnrol(true)} style={{ marginTop:16,background:"#800020",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontSize:14 }}>Enrol First Member</button>}
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
              <thead>
                <tr style={{ background:"#800020" }}>
                  {["#","Member","Account No.","Type","Amount","Balance After","Method","Date","Reference","Actions"].map(h => (
                    <th key={h} style={{ padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:0.6,whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                    <td style={{ padding:"11px 14px",color:"#bbb",fontSize:12 }}>{(page-1)*PER_PAGE+i+1}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ fontWeight:700,color:"#111",whiteSpace:"nowrap" }}>{getMemberName(t.member_id)}</div>
                      <div style={{ fontSize:11,color:"#aaa" }}>{getMemberNumber(t.member_id)}</div>
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"#555",fontFamily:"monospace" }}>{t.account_number}</td>
                    <td style={{ padding:"11px 14px" }}><Badge text={t.transaction_type} /></td>
                    <td style={{ padding:"11px 14px",fontWeight:800,whiteSpace:"nowrap",
                      color: t.transaction_type==="withdrawal" ? "#dc2626" : "#15803d" }}>
                      {t.transaction_type==="withdrawal"?"−":"+"}UGX {fmt(t.amount)}
                    </td>
                    <td style={{ padding:"11px 14px",fontWeight:700,color:"#800020",whiteSpace:"nowrap" }}>
                      UGX {fmt(t.balance_after)}
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"#555",whiteSpace:"nowrap" }}>
                      {t.payment_method?.replace("_"," ") || "—"}
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"#555",whiteSpace:"nowrap" }}>
                      {t.transaction_date || "—"}
                    </td>
                    <td style={{ padding:"11px 14px",fontSize:12,color:"#555",fontFamily:"monospace" }}>
                      {t.reference || <span style={{ color:"#ddd" }}>—</span>}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      {isAdmin && (
                        <button onClick={() => setConfirmDelete(t)} title="Delete"
                          style={{ background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:13 }}>🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:"#fff9f7",borderTop:"2px solid #f9e0e4" }}>
                  <td colSpan={4} style={{ padding:"10px 14px",fontSize:12,fontWeight:700,color:"#800020" }}>
                    {filtered.length} transaction{filtered.length!==1?"s":""}
                  </td>
                  <td style={{ padding:"10px 14px",fontWeight:800,color:"#800020",fontSize:14,whiteSpace:"nowrap" }}>
                    UGX {fmt(filtered.reduce((a,t)=>a+Number(t.amount),0))}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:"1px solid #f3f4f6",flexWrap:"wrap",gap:8 }}>
            <span style={{ fontSize:13,color:"#888" }}>Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</span>
            <div style={{ display:"flex",gap:6 }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{ padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===1?"not-allowed":"pointer",color:page===1?"#ccc":"#111",fontWeight:600,fontSize:13 }}>← Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[])
                .map((p,i)=>p==="..."
                  ?<span key={`d${i}`} style={{padding:"6px 4px",color:"#aaa",fontSize:13}}>…</span>
                  :<button key={p} onClick={()=>setPage(p)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid",borderColor:page===p?"#800020":"#e5e7eb",background:page===p?"#800020":"#fff",color:page===p?"#fff":"#111",fontWeight:700,cursor:"pointer",fontSize:13}}>{p}</button>
                )}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===totalPages?"not-allowed":"pointer",color:page===totalPages?"#ccc":"#111",fontWeight:600,fontSize:13 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals */}
      {showEnrol && (
        <Modal title="Enrol in The Treat" onClose={() => setShowEnrol(false)}>
          <EnrolForm
            members={members}
            existingMemberIds={existingMemberIds}
            onSave={handleEnrol}
            onCancel={() => setShowEnrol(false)}
            saving={saving}
          />
        </Modal>
      )}

      {ledgerAccount && (
        <MemberLedger
          account={ledgerAccount}
          memberName={getMemberName(ledgerAccount.member_id)}
          transactions={getMemberTx(ledgerAccount.member_id)}
          onClose={() => setLedgerAccount(null)}
          onDeposit={() => { setDepositFor(ledgerAccount); setLedgerAccount(null); }}
          onWithdraw={() => { setWithdrawFor(ledgerAccount); setLedgerAccount(null); }}
          isAdmin={isAdmin}
        />
      )}

      {depositFor && (
        <Modal title="Deposit to Treat Account" onClose={() => setDepositFor(null)}>
          <TransactionForm
            account={depositFor}
            memberName={getMemberName(depositFor.member_id)}
            currentBalance={getBalance(depositFor.member_id)}
            txType="deposit"
            onSave={handleTransaction}
            onCancel={() => setDepositFor(null)}
            saving={saving}
          />
        </Modal>
      )}

      {withdrawFor && (
        <Modal title="Withdraw from Treat Account" onClose={() => setWithdrawFor(null)}>
          <TransactionForm
            account={withdrawFor}
            memberName={getMemberName(withdrawFor.member_id)}
            currentBalance={getBalance(withdrawFor.member_id)}
            txType="withdrawal"
            onSave={handleTransaction}
            onCancel={() => setWithdrawFor(null)}
            saving={saving}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Transaction" onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign:"center",padding:"8px 0 16px" }}>
            <div style={{ fontSize:44,marginBottom:12 }}>⚠️</div>
            <p style={{ fontSize:16,color:"#111",fontWeight:600,margin:"0 0 6px" }}>Delete this transaction?</p>
            <p style={{ fontSize:14,color:"#800020",fontWeight:700,margin:"0 0 4px" }}>
              UGX {fmt(confirmDelete.amount)} — {getMemberName(confirmDelete.member_id)}
            </p>
            <p style={{ fontSize:13,color:"#888",margin:"0 0 24px" }}>
              ⚠ Note: deleting does not automatically update the balance_after of other records.
            </p>
            <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ padding:"10px 24px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",fontWeight:600,cursor:"pointer",fontSize:14 }}>Cancel</button>
              <button onClick={()=>handleDelete(confirmDelete.id)} style={{ padding:"10px 24px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14 }}>Yes, Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}