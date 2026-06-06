import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const LOAN_STATUSES   = ["pending", "approved", "rejected", "paid", "defaulted"];
const PAYMENT_METHODS = ["cash", "mobile_money", "bank_transfer", "cheque", "other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));

function Badge({ text }) {
  const map = {
    pending:   ["#fef9c3", "#a16207"],
    approved:  ["#dcfce7", "#15803d"],
    rejected:  ["#fee2e2", "#dc2626"],
    paid:      ["#eff6ff", "#1d4ed8"],
    defaulted: ["#fdf4ff", "#7e22ce"],
    cash:         ["#f0fdf4", "#15803d"],
    mobile_money: ["#eff6ff", "#1d4ed8"],
    bank_transfer:["#faf5ff", "#7e22ce"],
    cheque:       ["#fff7ed", "#c2410c"],
    other:        ["#f3f4f6", "#6b7280"],
  };
  const [bg, fg] = map[text?.toLowerCase()] || ["#f3f4f6", "#6b7280"];
  return (
    <span style={{
      background: bg, color: fg, fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 99, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>{text || "—"}</span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function RepayProgress({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const color = pct >= 100 ? "#15803d" : pct >= 60 ? "#ca8a04" : "#dc2626";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 3 }}>
        <span>{pct}% repaid</span>
        <span>UGX {fmt(paid)} / {fmt(total)}</span>
      </div>
      <div style={{ background: "#f0f0f0", borderRadius: 4, height: 6 }}>
        <div style={{ width: `${pct}%`, background: color, height: 6, borderRadius: 4, transition: "width 0.5s ease" }} />
      </div>
    </div>
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
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
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
function Field({ label, required, span, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: span ? "span 2" : "span 1" }}>
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

// ─── Loan Form ────────────────────────────────────────────────────────────────
const EMPTY = {
  members_id: "", loan_amount: "", interest_rate: "", total_amount_to_pay: "",
  amount_paid: "0", balance: "", loan_status: "pending",
  issue_date: new Date().toISOString().split("T")[0],
  due_date: "", payment_method: "cash", notes: "",
};

function LoanForm({ initial = EMPTY, members = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate total & balance
  function recalc(loan, rate, paid) {
    const l = Number(loan) || 0;
    const r = Number(rate) || 0;
    const p = Number(paid) || 0;
    const total = l + (l * r / 100);
    const balance = total - p;
    return { total: total.toFixed(2), balance: balance.toFixed(2) };
  }

  function handleLoanChange(k, v) {
    const updated = { ...form, [k]: v };
    if (["loan_amount", "interest_rate", "amount_paid"].includes(k)) {
      const { total, balance } = recalc(
        k === "loan_amount"   ? v : updated.loan_amount,
        k === "interest_rate" ? v : updated.interest_rate,
        k === "amount_paid"   ? v : updated.amount_paid,
      );
      updated.total_amount_to_pay = total;
      updated.balance = balance;
    }
    setForm(updated);
  }

  function validate() {
    const e = {};
    if (!form.members_id)                                         e.members_id = "Required";
    if (!form.loan_amount || Number(form.loan_amount) <= 0)       e.loan_amount = "Enter a valid amount";
    if (!form.interest_rate && form.interest_rate !== 0)          e.interest_rate = "Required (use 0 for no interest)";
    if (!form.issue_date)                                         e.issue_date = "Required";
    if (!form.due_date)                                           e.due_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const errStyle = (k) => errors[k] ? { borderColor: "#dc2626" } : {};

  return (
    <div>
      {/* Loan Details */}
      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1 }}>
        Loan Details
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>

        <Field label="Member" required span>
          <select value={form.members_id} onChange={e => set("members_id", e.target.value)}
            style={{ ...sel, ...errStyle("members_id") }}>
            <option value="">— Select member —</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
          </select>
          {errors.members_id && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.members_id}</span>}
        </Field>

        <Field label="Loan Amount (UGX)" required>
          <input type="number" min="0" placeholder="0" value={form.loan_amount}
            onChange={e => handleLoanChange("loan_amount", e.target.value)}
            style={{ ...inp, ...errStyle("loan_amount") }} />
          {errors.loan_amount && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.loan_amount}</span>}
        </Field>

        <Field label="Interest Rate (%)" required>
          <input type="number" min="0" step="0.1" placeholder="e.g. 10" value={form.interest_rate}
            onChange={e => handleLoanChange("interest_rate", e.target.value)}
            style={{ ...inp, ...errStyle("interest_rate") }} />
          {errors.interest_rate && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.interest_rate}</span>}
        </Field>

        <Field label="Total to Pay (UGX)">
          <input type="number" value={form.total_amount_to_pay} readOnly
            style={{ ...inp, background: "#f3f4f6", color: "#800020", fontWeight: 700 }} />
          <span style={{ fontSize: 11, color: "#aaa" }}>Auto-calculated</span>
        </Field>

        <Field label="Amount Paid (UGX)">
          <input type="number" min="0" placeholder="0" value={form.amount_paid}
            onChange={e => handleLoanChange("amount_paid", e.target.value)}
            style={inp} />
        </Field>

        <Field label="Balance (UGX)">
          <input type="number" value={form.balance} readOnly
            style={{ ...inp, background: "#f3f4f6", color: form.balance > 0 ? "#dc2626" : "#15803d", fontWeight: 700 }} />
          <span style={{ fontSize: 11, color: "#aaa" }}>Auto-calculated</span>
        </Field>

        <Field label="Issue Date" required>
          <input type="date" value={form.issue_date}
            onChange={e => set("issue_date", e.target.value)}
            style={{ ...inp, ...errStyle("issue_date") }} />
          {errors.issue_date && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.issue_date}</span>}
        </Field>

        <Field label="Due Date" required>
          <input type="date" value={form.due_date}
            onChange={e => set("due_date", e.target.value)}
            style={{ ...inp, ...errStyle("due_date") }} />
          {errors.due_date && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.due_date}</span>}
        </Field>

        <Field label="Loan Status">
          <select value={form.loan_status} onChange={e => set("loan_status", e.target.value)} style={sel}>
            {LOAN_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Payment Method">
          <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} style={sel}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>

        <Field label="Notes" span>
          <textarea rows={3} placeholder="Optional remarks…" value={form.notes}
            onChange={e => set("notes", e.target.value)}
            style={{ ...inp, resize: "vertical" }} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb",
          background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer", fontSize: 14,
        }}>Cancel</button>
        <button onClick={() => { if (validate()) onSave(form); }} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: saving ? "#c0606f" : "#800020", color: "#fff",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14,
        }}>{saving ? "Saving…" : "Save Loan"}</button>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────
function RecordPayment({ loan, memberName, onSave, onCancel, saving }) {
  const remaining = Number(loan.balance) || 0;
  const [amount, setAmount]   = useState("");
  const [method, setMethod]   = useState("cash");
  const [notes, setNotes]     = useState("");
  const [error, setError]     = useState("");

  function handleSave() {
    const pay = Number(amount);
    if (!pay || pay <= 0)        { setError("Enter a valid payment amount"); return; }
    if (pay > remaining + 0.01)  { setError(`Cannot exceed balance of UGX ${fmt(remaining)}`); return; }
    const newPaid    = Number(loan.amount_paid || 0) + pay;
    const newBalance = Number(loan.total_amount_to_pay) - newPaid;
    const newStatus  = newBalance <= 0.01 ? "paid" : loan.loan_status;
    onSave({ amount_paid: newPaid.toFixed(2), balance: Math.max(0, newBalance).toFixed(2), loan_status: newStatus, payment_method: method, notes: notes || loan.notes });
  }

  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)", borderRadius: 12,
        padding: "16px 20px", marginBottom: 20, color: "#fff",
      }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Outstanding Balance</div>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "Georgia, serif" }}>UGX {fmt(remaining)}</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{memberName}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Payment Amount (UGX)" required>
          <input type="number" min="0" max={remaining} placeholder="0"
            value={amount} onChange={e => { setAmount(e.target.value); setError(""); }}
            style={{ ...inp, ...(error ? { borderColor: "#dc2626" } : {}) }} />
          {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}
          <span style={{ fontSize: 11, color: "#aaa" }}>
            After payment: balance will be UGX {fmt(Math.max(0, remaining - (Number(amount) || 0)))}
          </span>
        </Field>
        <Field label="Payment Method">
          <select value={method} onChange={e => setMethod(e.target.value)} style={sel}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional note…" style={{ ...inp, resize: "vertical" }} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb",
          background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer", fontSize: 14,
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: saving ? "#c0606f" : "#15803d", color: "#fff",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14,
        }}>{saving ? "Recording…" : "💳 Record Payment"}</button>
      </div>
    </div>
  );
}

// ─── View Loan Modal ──────────────────────────────────────────────────────────
function ViewLoan({ loan, memberName, onClose, onEdit, onPayment, isAdmin }) {
  const paid    = Number(loan.amount_paid || 0);
  const total   = Number(loan.total_amount_to_pay || 0);
  const balance = Number(loan.balance || 0);
  const isOverdue = loan.due_date && new Date(loan.due_date) < new Date() && loan.loan_status !== "paid";

  const rows = [
    ["Loan Amount",    `UGX ${fmt(loan.loan_amount)}`],
    ["Interest Rate",  `${loan.interest_rate}%`],
    ["Total to Pay",   `UGX ${fmt(total)}`],
    ["Amount Paid",    `UGX ${fmt(paid)}`],
    ["Balance",        `UGX ${fmt(balance)}`],
    ["Issue Date",     loan.issue_date ? new Date(loan.issue_date).toLocaleDateString() : "—"],
    ["Due Date",       loan.due_date   ? new Date(loan.due_date).toLocaleDateString()   : "—"],
    ["Payment Method", <Badge text={loan.payment_method} />],
    ["Notes",          loan.notes || "—"],
  ];

  return (
    <Modal title="Loan Details" onClose={onClose}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 12, padding: "18px 22px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Loan Amount</div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, fontFamily: "Georgia, serif", marginTop: 4 }}>UGX {fmt(loan.loan_amount)}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge text={loan.loan_status} />
            {isOverdue && <span style={{ background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99 }}>OVERDUE</span>}
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{memberName}</span>
          </div>
        </div>
        <div style={{ fontSize: 40, opacity: 0.2 }}>📋</div>
      </div>

      {/* Repayment progress */}
      <div style={{ background: "#fafafa", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Repayment Progress
        </div>
        <RepayProgress paid={paid} total={total} />
      </div>

      {/* Detail grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#f3f4f6", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        {rows.map(([label, val], i) => (
          <div key={i} style={{ background: "#fff", padding: "10px 14px", gridColumn: i === rows.length - 1 ? "span 2" : "span 1" }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {loan.loan_status === "approved" && balance > 0 && (
            <button onClick={onPayment} style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: "#15803d", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
            }}>💳 Record Payment</button>
          )}
          <button onClick={onEdit} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#800020", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}>✏️ Edit Loan</button>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LOANS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Loans() {
  const { role } = useAuth();
  const isAdmin  = role === "admin";

  const [loans,    setLoans]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [overdueOnly,  setOverdueOnly]  = useState(false);
  const [page,         setPage]         = useState(1);
  const PER_PAGE = 10;

  const [showAdd,       setShowAdd]       = useState(false);
  const [editLoan,      setEditLoan]      = useState(null);
  const [viewLoan,      setViewLoan]      = useState(null);
  const [paymentLoan,   setPaymentLoan]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [lnRes, mbRes] = await Promise.all([
      supabase.from("loans").select("*").order("created_at", { ascending: false }),
      supabase.from("members").select("id, full_name, member_number"),
    ]);
    setLoans(lnRes.data || []);
    setMembers(mbRes.data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleAdd(form) {
    setSaving(true);
    const { error } = await supabase.from("loans").insert([{
      ...form,
      members_id: Number(form.members_id),
      loan_amount: Number(form.loan_amount),
      interest_rate: Number(form.interest_rate),
      total_amount_to_pay: Number(form.total_amount_to_pay),
      amount_paid: Number(form.amount_paid || 0),
      balance: Number(form.balance || form.total_amount_to_pay),
    }]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Loan created successfully!");
    setShowAdd(false);
    loadAll();
  }

  async function handleEdit(form) {
    setSaving(true);
    const { error } = await supabase.from("loans").update({
      ...form,
      members_id: Number(form.members_id),
      loan_amount: Number(form.loan_amount),
      interest_rate: Number(form.interest_rate),
      total_amount_to_pay: Number(form.total_amount_to_pay),
      amount_paid: Number(form.amount_paid || 0),
      balance: Number(form.balance || 0),
    }).eq("id", editLoan.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Loan updated!");
    setEditLoan(null);
    setViewLoan(null);
    loadAll();
  }

  async function handlePayment(fields) {
    setSaving(true);
    const { error } = await supabase.from("loans").update(fields).eq("id", paymentLoan.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Payment recorded!");
    setPaymentLoan(null);
    setViewLoan(null);
    loadAll();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Loan deleted.");
    setConfirmDelete(null);
    setViewLoan(null);
    loadAll();
  }

  const getMemberName   = (id) => members.find(m => m.id === id)?.full_name   || `Member #${id}`;
  const getMemberNumber = (id) => members.find(m => m.id === id)?.member_number || "";

  // ── KPIs
  const today       = new Date().toISOString().split("T")[0];
  const approved    = loans.filter(l => l.loan_status === "approved");
  const pending     = loans.filter(l => l.loan_status === "pending");
  const overdue     = loans.filter(l => l.loan_status === "approved" && l.due_date && l.due_date < today);
  const totalIssued = loans.reduce((a, l) => a + Number(l.loan_amount), 0);
  const outstanding = approved.reduce((a, l) => a + Number(l.balance || 0), 0);
  const totalPaid   = loans.reduce((a, l) => a + Number(l.amount_paid || 0), 0);
  const repayRate   = (totalIssued > 0) ? Math.round((totalPaid / loans.reduce((a,l)=>a+Number(l.total_amount_to_pay),0)) * 100) : 0;

  // ── Filter
  const filtered = loans.filter(l => {
    const q = search.toLowerCase();
    const name = getMemberName(l.members_id).toLowerCase();
    const num  = getMemberNumber(l.members_id).toLowerCase();
    const matchSearch = !q || name.includes(q) || num.includes(q) || String(l.loan_amount).includes(q);
    const matchStatus = statusFilter === "all" || l.loan_status === statusFilter;
    const matchMethod = methodFilter === "all" || l.payment_method === methodFilter;
    const matchOverdue = !overdueOnly || (l.loan_status === "approved" && l.due_date && l.due_date < today);
    return matchSearch && matchStatus && matchMethod && matchOverdue;
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
        @keyframes slideIn { from { transform: translateX(40px); opacity:0; } to { transform: translateX(0); opacity:1; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        tr:hover td { background: #fff9f9 !important; }
        input:focus, select:focus, textarea:focus { border-color: #800020 !important; box-shadow: 0 0 0 3px rgba(128,0,32,0.08); outline: none; }
      `}</style>

      {/* ── Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#800020", fontFamily: "Georgia, serif" }}>Loans</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            {loans.length} total loans · {overdue.length > 0 && <span style={{ color: "#dc2626", fontWeight: 700 }}>{overdue.length} overdue ⚠</span>}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{
            background: "#800020", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}>+ New Loan</button>
        )}
      </div>

      {/* ── KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KPICard icon="🏦" label="Total Issued"     value={`UGX ${fmt(totalIssued)}`}  sub={`${loans.length} loans`}       accent="#800020" />
        <KPICard icon="⏳" label="Outstanding"      value={`UGX ${fmt(outstanding)}`}  sub={`${approved.length} active`}   accent="#2563eb" />
        <KPICard icon="✅" label="Total Collected"  value={`UGX ${fmt(totalPaid)}`}    sub={`${repayRate}% repayment rate`} accent="#15803d" />
        <KPICard icon="🕐" label="Pending Approval" value={pending.length}             sub="awaiting approval"             accent="#ca8a04" />
        <KPICard icon="⚠️" label="Overdue Loans"   value={overdue.length}             sub="past due date"                 accent="#dc2626" />
      </div>

      {/* ── Filters */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 16,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }}>🔍</span>
          <input placeholder="Search member, amount…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inp, paddingLeft: 32 }} />
        </div>

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...sel, flex: "0 1 150px" }}>
          <option value="all">All Status</option>
          {LOAN_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>

        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
          style={{ ...sel, flex: "0 1 155px" }}>
          <option value="all">All Methods</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 600, color: overdueOnly ? "#dc2626" : "#555", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={overdueOnly} onChange={e => { setOverdueOnly(e.target.checked); setPage(1); }}
            style={{ accentColor: "#dc2626", width: 15, height: 15 }} />
          Overdue only
        </label>

        {(search || statusFilter !== "all" || methodFilter !== "all" || overdueOnly) && (
          <button onClick={() => { setSearch(""); setStatusFilter("all"); setMethodFilter("all"); setOverdueOnly(false); setPage(1); }}
            style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            ✕ Clear
          </button>
        )}

        <span style={{ fontSize: 13, color: "#888", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #f0e8ea", borderTop: "3px solid #800020", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "#aaa", margin: 0 }}>Loading loans…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>📭</div>
            <p style={{ color: "#888", margin: 0, fontSize: 15 }}>No loans match your search.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#800020" }}>
                  {["#","Member","Loan Amt","Interest","Total to Pay","Paid","Balance","Status","Due Date","Actions"].map(h => (
                    <th key={h} style={{
                      padding: "12px 14px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: "#fff",
                      textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((l, i) => {
                  const isOverdueRow = l.loan_status === "approved" && l.due_date && l.due_date < today;
                  const balance = Number(l.balance || 0);
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid #f3f4f6", background: isOverdueRow ? "#fff9f9" : "#fff" }}>
                      <td style={{ padding: "11px 14px", color: "#bbb", fontSize: 12 }}>{(page-1)*PER_PAGE+i+1}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>{getMemberName(l.members_id)}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>{getMemberNumber(l.members_id)}</div>
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>UGX {fmt(l.loan_amount)}</td>
                      <td style={{ padding: "11px 14px", color: "#555", whiteSpace: "nowrap" }}>{l.interest_rate}%</td>
                      <td style={{ padding: "11px 14px", color: "#555", whiteSpace: "nowrap" }}>UGX {fmt(l.total_amount_to_pay)}</td>
                      <td style={{ padding: "11px 14px", color: "#15803d", fontWeight: 700, whiteSpace: "nowrap" }}>UGX {fmt(l.amount_paid)}</td>
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: balance > 0 ? "#dc2626" : "#15803d" }}>UGX {fmt(balance)}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <Badge text={l.loan_status} />
                          {isOverdueRow && <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>OVERDUE</span>}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, whiteSpace: "nowrap", color: isOverdueRow ? "#dc2626" : "#555", fontWeight: isOverdueRow ? 700 : 400 }}>
                        {l.due_date ? new Date(l.due_date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setViewLoan(l)} title="View"
                            style={{ background: "#f5f0f1", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>👁</button>
                          {isAdmin && l.loan_status === "approved" && balance > 0 && (
                            <button onClick={() => setPaymentLoan(l)} title="Record payment"
                              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>💳</button>
                          )}
                          {isAdmin && (
                            <button onClick={() => setEditLoan(l)} title="Edit"
                              style={{ background: "#fff5f7", border: "1px solid #f9c0c0", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>✏️</button>
                          )}
                          {isAdmin && (
                            <button onClick={() => setConfirmDelete(l)} title="Delete"
                              style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#fff9f7", borderTop: "2px solid #f9e0e4" }}>
                  <td colSpan={2} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#800020" }}>Totals</td>
                  <td style={{ padding: "10px 14px", fontWeight: 800, color: "#800020", fontSize: 13, whiteSpace: "nowrap" }}>
                    UGX {fmt(filtered.reduce((a,l)=>a+Number(l.loan_amount),0))}
                  </td>
                  <td style={{ padding: "10px 14px" }} />
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#555", fontSize: 13, whiteSpace: "nowrap" }}>
                    UGX {fmt(filtered.reduce((a,l)=>a+Number(l.total_amount_to_pay),0))}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#15803d", fontSize: 13, whiteSpace: "nowrap" }}>
                    UGX {fmt(filtered.reduce((a,l)=>a+Number(l.amount_paid||0),0))}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#dc2626", fontSize: 13, whiteSpace: "nowrap" }}>
                    UGX {fmt(filtered.reduce((a,l)=>a+Number(l.balance||0),0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f3f4f6", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#888" }}>
              Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{ padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===1?"not-allowed":"pointer",color:page===1?"#ccc":"#111",fontWeight:600,fontSize:13 }}>← Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1)acc.push("..."); acc.push(p); return acc; },[])
                .map((p,i)=>p==="..."
                  ?<span key={`d${i}`} style={{padding:"6px 4px",color:"#aaa",fontSize:13}}>…</span>
                  :<button key={p} onClick={()=>setPage(p)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid",borderColor:page===p?"#800020":"#e5e7eb",background:page===p?"#800020":"#fff",color:page===p?"#fff":"#111",fontWeight:700,cursor:"pointer",fontSize:13}}>{p}</button>
                )}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===totalPages?"not-allowed":"pointer",color:page===totalPages?"#ccc":"#111",fontWeight:600,fontSize:13}}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals */}
      {showAdd && (
        <Modal title="New Loan" onClose={() => setShowAdd(false)}>
          <LoanForm members={members} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </Modal>
      )}

      {editLoan && (
        <Modal title="Edit Loan" onClose={() => setEditLoan(null)}>
          <LoanForm
            initial={{ ...editLoan, members_id: String(editLoan.members_id) }}
            members={members} onSave={handleEdit} onCancel={() => setEditLoan(null)} saving={saving}
          />
        </Modal>
      )}

      {viewLoan && (
        <ViewLoan
          loan={viewLoan}
          memberName={getMemberName(viewLoan.members_id)}
          onClose={() => setViewLoan(null)}
          onEdit={() => { setEditLoan(viewLoan); setViewLoan(null); }}
          onPayment={() => { setPaymentLoan(viewLoan); setViewLoan(null); }}
          isAdmin={isAdmin}
        />
      )}

      {paymentLoan && (
        <Modal title="Record Payment" onClose={() => setPaymentLoan(null)}>
          <RecordPayment
            loan={paymentLoan}
            memberName={getMemberName(paymentLoan.members_id)}
            onSave={handlePayment}
            onCancel={() => setPaymentLoan(null)}
            saving={saving}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Loan" onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 16, color: "#111", fontWeight: 600, margin: "0 0 6px" }}>Delete this loan?</p>
            <p style={{ fontSize: 14, color: "#800020", fontWeight: 700, margin: "0 0 4px" }}>
              UGX {fmt(confirmDelete.loan_amount)} — {getMemberName(confirmDelete.members_id)}
            </p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 24px" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "10px 24px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Yes, Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
