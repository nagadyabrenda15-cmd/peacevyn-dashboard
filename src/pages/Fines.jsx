import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle, XCircle, CheckCircle2, BarChart3, Clock, HandHeart,
  Search, X, Inbox, Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const FINE_STATUSES = ["unpaid", "paid", "waived", "partial"];
const FINE_REASONS  = [
  "Late payment", "Missed meeting", "Late savings contribution",
  "Misconduct", "Breach of rules", "Incomplete documentation", "Other"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));
const toDay = () => new Date().toISOString().split("T")[0];

function Badge({ text }) {
  const map = {
    unpaid:  ["#fee2e2", "#dc2626"],
    paid:    ["#dcfce7", "#15803d"],
    waived:  ["#f3f4f6", "#6b7280"],
    partial: ["#fef9c3", "#a16207"],
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
function KPICard({ Icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "16px 18px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderLeft: `4px solid ${accent}`,
      display: "flex", gap: 14, alignItems: "center",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: `${accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: accent,
      }}><Icon size={22}/></div>
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
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 620,
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

// ─── Fine Form ────────────────────────────────────────────────────────────────
const EMPTY = {
  member_id: "", fine_reason: "Late payment", amount: "",
  fine_status: "unpaid",
  issued_date: toDay(), payment_date: toDay(), notes: "",
};

function FineForm({ initial = EMPTY, members = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.member_id)                                   e.member_id = "Required";
    if (!form.fine_reason.trim())                          e.fine_reason = "Required";
    if (!form.amount || Number(form.amount) <= 0)          e.amount = "Enter a valid amount";
    if (!form.issued_date)                                 e.issued_date = "Required";
    if (!form.payment_date)                                e.payment_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const errStyle = (k) => errors[k] ? { borderColor: "#dc2626" } : {};

  return (
    <div>
      <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1 }}>
        Fine Details
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>

        <Field label="Member" required span>
          <select value={form.member_id} onChange={e => set("member_id", e.target.value)}
            style={{ ...sel, ...errStyle("member_id") }}>
            <option value="">— Select member —</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
          </select>
          {errors.member_id && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.member_id}</span>}
        </Field>

        <Field label="Fine Reason" required span>
          <select value={form.fine_reason} onChange={e => set("fine_reason", e.target.value)}
            style={{ ...sel, ...errStyle("fine_reason") }}>
            {FINE_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
          {form.fine_reason === "Other" && (
            <input type="text" placeholder="Describe reason…" value={form.custom_reason || ""}
              onChange={e => set("custom_reason", e.target.value)} style={{ ...inp, marginTop: 6 }} />
          )}
        </Field>

        <Field label="Amount (UGX)" required>
          <input type="number" min="0" placeholder="0" value={form.amount}
            onChange={e => set("amount", e.target.value)}
            style={{ ...inp, ...errStyle("amount") }} />
          {errors.amount && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.amount}</span>}
        </Field>

        <Field label="Status" required>
          <select value={form.fine_status} onChange={e => set("fine_status", e.target.value)} style={sel}>
            {FINE_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Issue Date" required>
          <input type="date" value={form.issued_date}
            onChange={e => set("issued_date", e.target.value)}
            style={{ ...inp, ...errStyle("issued_date") }} />
          {errors.issued_date && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.issued_date}</span>}
        </Field>

        <Field label="Payment Due Date" required>
          <input type="date" value={form.payment_date}
            onChange={e => set("payment_date", e.target.value)}
            style={{ ...inp, ...errStyle("payment_date") }} />
          {errors.payment_date && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.payment_date}</span>}
        </Field>

        <Field label="Notes" span>
          <textarea rows={3} placeholder="Optional remarks…" value={form.notes || ""}
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
        }}>{saving ? "Saving…" : "Save Fine"}</button>
      </div>
    </div>
  );
}

// ─── Mark Paid Modal ──────────────────────────────────────────────────────────
function MarkPaidForm({ fine, memberName, onSave, onCancel, saving }) {
  const [status, setStatus] = useState("paid");
  const [notes, setNotes]   = useState(fine.notes || "");

  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 20, color: "#fff",
      }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Fine Amount</div>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "Georgia, serif" }}>UGX {fmt(fine.amount)}</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{memberName} · {fine.fine_reason}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Update Status">
          <select value={status} onChange={e => setStatus(e.target.value)} style={sel}>
            {FINE_STATUSES.map(s => <option key={s}>{s}</option>)}
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
        <button onClick={() => onSave({ fine_status: status, notes })} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: saving ? "#c0606f" : "#15803d", color: "#fff",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14,
        }}>{saving ? "Updating…" : <span style={{display:"flex",alignItems:"center",gap:6}}><CheckCircle2 size={14}/>Update Status</span>}</button>
      </div>
    </div>
  );
}

// ─── View Fine Modal ──────────────────────────────────────────────────────────
function ViewFine({ fine, memberName, onClose, onEdit, onMarkPaid, isAdmin }) {
  const isOverdue = fine.fine_status === "unpaid" && fine.payment_date && fine.payment_date < toDay();
  const rows = [
    ["Fine Reason",   fine.fine_reason],
    ["Status",        <Badge text={fine.fine_status} />],
    ["Issued Date",   fine.issued_date   ? new Date(fine.issued_date).toLocaleDateString()   : "—"],
    ["Payment Due",   fine.payment_date  ? new Date(fine.payment_date).toLocaleDateString()  : "—"],
    ["Created",       fine.created_at    ? new Date(fine.created_at).toLocaleDateString()    : "—"],
    ["Notes",         fine.notes || "—"],
  ];

  return (
    <Modal title="Fine Record" onClose={onClose}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 12, padding: "18px 22px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Fine Amount</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Georgia, serif", marginTop: 4 }}>UGX {fmt(fine.amount)}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge text={fine.fine_status} />
            {isOverdue && (
              <span style={{ background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99 }}>OVERDUE</span>
            )}
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{memberName}</span>
          </div>
        </div>
        <AlertTriangle size={36} style={{opacity:0.3,color:"#fff"}}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#f3f4f6", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        {rows.map(([label, val], i) => (
          <div key={i} style={{
            background: "#fff", padding: "10px 14px",
            gridColumn: i >= rows.length - 1 ? "span 2" : "span 1",
          }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {fine.fine_status !== "paid" && fine.fine_status !== "waived" && (
            <button onClick={onMarkPaid} style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: "#15803d", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
              display:"flex",alignItems:"center",gap:6,
            }}><CheckCircle2 size={15}/>Update Status</button>
          )}
          <button onClick={onEdit} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#800020", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
            display:"flex",alignItems:"center",gap:6,
          }}><Pencil size={15}/>Edit Fine</button>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FINES PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Fines() {
  const { role } = useAuth();
  const isAdmin  = role === "admin";

  const [fines,    setFines]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [overdueOnly,  setOverdueOnly]  = useState(false);
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [page,         setPage]         = useState(1);
  const PER_PAGE = 12;

  const [showAdd,       setShowAdd]       = useState(false);
  const [editFine,      setEditFine]      = useState(null);
  const [viewFine,      setViewFine]      = useState(null);
  const [markPaidFine,  setMarkPaidFine]  = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [fnRes, mbRes] = await Promise.all([
      supabase.from("fines").select("*").order("created_at", { ascending: false }),
      supabase.from("members").select("id, full_name, member_number"),
    ]);
    setFines(fnRes.data || []);
    setMembers(mbRes.data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleAdd(form) {
    setSaving(true);
    const reason = form.fine_reason === "Other" && form.custom_reason ? form.custom_reason : form.fine_reason;
    const { error } = await supabase.from("fines").insert([{
      member_id:    Number(form.member_id),
      fine_reason:  reason,
      amount:       Number(form.amount),
      fine_status:  form.fine_status,
      issued_date:  form.issued_date,
      payment_date: form.payment_date,
      notes:        form.notes || null,
    }]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Fine issued successfully!");
    setShowAdd(false);
    loadAll();
  }

  async function handleEdit(form) {
    setSaving(true);
    const reason = form.fine_reason === "Other" && form.custom_reason ? form.custom_reason : form.fine_reason;
    const { error } = await supabase.from("fines").update({
      member_id:    Number(form.member_id),
      fine_reason:  reason,
      amount:       Number(form.amount),
      fine_status:  form.fine_status,
      issued_date:  form.issued_date,
      payment_date: form.payment_date,
      notes:        form.notes || null,
    }).eq("id", editFine.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Fine updated!");
    setEditFine(null);
    setViewFine(null);
    loadAll();
  }

  async function handleMarkPaid(fields) {
    setSaving(true);
    const { error } = await supabase.from("fines").update(fields).eq("id", markPaidFine.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Status updated!");
    setMarkPaidFine(null);
    setViewFine(null);
    loadAll();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("fines").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Fine deleted.");
    setConfirmDelete(null);
    setViewFine(null);
    loadAll();
  }

  const getMemberName   = (id) => members.find(m => m.id === id)?.full_name    || `Member #${id}`;
  const getMemberNumber = (id) => members.find(m => m.id === id)?.member_number || "";

  // ── KPIs
  const today        = toDay();
  const totalFines   = fines.reduce((a, f) => a + Number(f.amount), 0);
  const unpaidFines  = fines.filter(f => f.fine_status === "unpaid");
  const paidFines    = fines.filter(f => f.fine_status === "paid");
  const waivedFines  = fines.filter(f => f.fine_status === "waived");
  const overdueFines = fines.filter(f => f.fine_status === "unpaid" && f.payment_date && f.payment_date < today);
  const totalUnpaid  = unpaidFines.reduce((a, f) => a + Number(f.amount), 0);
  const totalPaid    = paidFines.reduce((a, f) => a + Number(f.amount), 0);
  const collRate     = totalFines > 0 ? Math.round((totalPaid / totalFines) * 100) : 0;

  // unique reasons for filter dropdown
  const uniqueReasons = [...new Set(fines.map(f => f.fine_reason).filter(Boolean))];

  // ── Filter
  const filtered = fines.filter(f => {
    const q = search.toLowerCase();
    const name = getMemberName(f.member_id).toLowerCase();
    const num  = getMemberNumber(f.member_id).toLowerCase();
    const matchSearch  = !q || name.includes(q) || num.includes(q) ||
      f.fine_reason?.toLowerCase().includes(q) ||
      String(f.amount).includes(q) ||
      f.notes?.toLowerCase().includes(q);
    const matchStatus  = statusFilter === "all" || f.fine_status === statusFilter;
    const matchReason  = reasonFilter === "all" || f.fine_reason === reasonFilter;
    const matchOverdue = !overdueOnly || (f.fine_status === "unpaid" && f.payment_date && f.payment_date < today);
    const matchFrom    = !dateFrom || f.issued_date >= dateFrom;
    const matchTo      = !dateTo   || f.issued_date <= dateTo;
    return matchSearch && matchStatus && matchReason && matchOverdue && matchFrom && matchTo;
  });

  const totalPages      = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated       = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const filteredTotal   = filtered.reduce((a, f) => a + Number(f.amount), 0);

  return (
    <div style={{ background: "#f8f7f5", minHeight: "100vh", padding: "20px 16px", fontFamily: "sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "error" ? "#dc2626" : "#15803d",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease", display:"flex", alignItems:"center", gap:8,
        }}>
          {toast.type === "error" ? <XCircle size={16}/> : <CheckCircle2 size={16}/>}{toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform:translateX(40px);opacity:0; } to { transform:translateX(0);opacity:1; } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        tr:hover td { background:#fff9f9 !important; }
        input:focus,select:focus,textarea:focus { border-color:#800020 !important; box-shadow:0 0 0 3px rgba(128,0,32,0.08); outline:none; }
      `}</style>

      {/* ── Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#800020", fontFamily:"Georgia, serif" }}>Fines</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#888" }}>
            {fines.length} total records
            {overdueFines.length > 0 && (
              <span style={{ color:"#dc2626", fontWeight:700 }}> · {overdueFines.length} overdue</span>
            )}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{
            background:"#800020", color:"#fff", border:"none",
            borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14,
          }}>+ Issue Fine</button>
        )}
      </div>

      {/* ── KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12, marginBottom:20 }}>
        <KPICard Icon={AlertTriangle} label="Total Issued"     value={`UGX ${fmt(totalFines)}`}  sub={`${fines.length} fines`}                accent="#800020" />
        <KPICard Icon={XCircle}       label="Unpaid"            value={`UGX ${fmt(totalUnpaid)}`} sub={`${unpaidFines.length} outstanding`}    accent="#dc2626" />
        <KPICard Icon={CheckCircle2}  label="Collected"         value={`UGX ${fmt(totalPaid)}`}   sub={`${paidFines.length} paid`}             accent="#15803d" />
        <KPICard Icon={BarChart3}     label="Collection Rate"   value={`${collRate}%`}             sub="of total fines collected"              accent={collRate >= 70 ? "#15803d" : "#ca8a04"} />
        <KPICard Icon={Clock}         label="Overdue"           value={overdueFines.length}        sub="unpaid past due date"                  accent="#dc2626" />
        <KPICard Icon={HandHeart}     label="Waived"            value={waivedFines.length}         sub={`UGX ${fmt(waivedFines.reduce((a,f)=>a+Number(f.amount),0))}`} accent="#6b7280" />
      </div>

      {/* ── Collection progress bar */}
      <div style={{ background:"#fff", borderRadius:12, padding:"14px 18px", marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, color:"#555", marginBottom:6 }}>
          <span>Collection Progress</span>
          <span style={{ color:"#800020" }}>{collRate}% — UGX {fmt(totalPaid)} of {fmt(totalFines)}</span>
        </div>
        <div style={{ background:"#f0f0f0", borderRadius:6, height:10 }}>
          <div style={{
            width:`${collRate}%`, height:10, borderRadius:6,
            background: collRate >= 70 ? "#15803d" : collRate >= 40 ? "#ca8a04" : "#dc2626",
            transition:"width 0.6s ease",
          }} />
        </div>
        <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap" }}>
          {[
            { label:"Paid",    val:totalPaid,   color:"#15803d" },
            { label:"Unpaid",  val:totalUnpaid, color:"#dc2626" },
            { label:"Waived",  val:waivedFines.reduce((a,f)=>a+Number(f.amount),0), color:"#6b7280" },
          ].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:s.color }} />
              <span style={{ color:"#555" }}>{s.label}: <strong style={{ color:s.color }}>UGX {fmt(s.val)}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters */}
      <div style={{
        background:"#fff", borderRadius:12, padding:"14px 16px",
        boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:16,
        display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
      }}>
        <div style={{ position:"relative", flex:"1 1 200px" }}>
          <Search size={15} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }}/>
          <input placeholder="Search member, reason, notes…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inp, paddingLeft:32 }} />
        </div>

        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...sel, flex:"0 1 140px" }}>
          <option value="all">All Status</option>
          {FINE_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>

        <select value={reasonFilter} onChange={e => { setReasonFilter(e.target.value); setPage(1); }}
          style={{ ...sel, flex:"0 1 190px" }}>
          <option value="all">All Reasons</option>
          {uniqueReasons.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ ...inp, flex:"0 1 140px" }} title="From issued date" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ ...inp, flex:"0 1 140px" }} title="To issued date" />

        <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, cursor:"pointer", fontWeight:600, color:overdueOnly?"#dc2626":"#555", whiteSpace:"nowrap" }}>
          <input type="checkbox" checked={overdueOnly} onChange={e => { setOverdueOnly(e.target.checked); setPage(1); }}
            style={{ accentColor:"#dc2626", width:15, height:15 }} />
          Overdue only
        </label>

        {(search || statusFilter !== "all" || reasonFilter !== "all" || overdueOnly || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setStatusFilter("all"); setReasonFilter("all"); setOverdueOnly(false); setDateFrom(""); setDateTo(""); setPage(1); }}
            style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
            <X size={13}/> Clear
          </button>
        )}

        <span style={{ fontSize:13, color:"#888", whiteSpace:"nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} · UGX {fmt(filteredTotal)}
        </span>
      </div>

      {/* ── Table */}
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:48, textAlign:"center" }}>
            <div style={{ width:32, height:32, border:"3px solid #f0e8ea", borderTop:"3px solid #800020", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
            <p style={{ color:"#aaa", margin:0 }}>Loading fines…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding:"52px 20px", textAlign:"center" }}>
            <Inbox size={42} style={{marginBottom:10,opacity:0.3,color:"#800020"}}/>
            <p style={{ color:"#888", margin:0, fontSize:15 }}>No fines match your search.</p>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
              <thead>
                <tr style={{ background:"#800020" }}>
                  {["#","Member","Reason","Amount","Status","Issued","Due Date","Actions"].map(h => (
                    <th key={h} style={{
                      padding:"12px 14px", textAlign:"left",
                      fontSize:11, fontWeight:700, color:"#fff",
                      textTransform:"uppercase", letterSpacing:0.6, whiteSpace:"nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((f, i) => {
                  const isOverdueRow = f.fine_status === "unpaid" && f.payment_date && f.payment_date < today;
                  return (
                    <tr key={f.id} style={{ borderBottom:"1px solid #f3f4f6", background: isOverdueRow ? "#fff9f9" : "#fff" }}>
                      <td style={{ padding:"11px 14px", color:"#bbb", fontSize:12 }}>{(page-1)*PER_PAGE+i+1}</td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ fontWeight:700, color:"#111", whiteSpace:"nowrap" }}>{getMemberName(f.member_id)}</div>
                        <div style={{ fontSize:11, color:"#aaa" }}>{getMemberNumber(f.member_id)}</div>
                      </td>
                      <td style={{ padding:"11px 14px", color:"#444", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {f.fine_reason}
                      </td>
                      <td style={{ padding:"11px 14px", fontWeight:800, color:"#800020", whiteSpace:"nowrap" }}>
                        UGX {fmt(f.amount)}
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <Badge text={f.fine_status} />
                          {isOverdueRow && <span style={{ fontSize:10, color:"#dc2626", fontWeight:700 }}>OVERDUE</span>}
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px", color:"#555", fontSize:12, whiteSpace:"nowrap" }}>
                        {f.issued_date ? new Date(f.issued_date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding:"11px 14px", fontSize:12, whiteSpace:"nowrap", color:isOverdueRow?"#dc2626":"#555", fontWeight:isOverdueRow?700:400 }}>
                        {f.payment_date ? new Date(f.payment_date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => setViewFine(f)} title="View"
                            style={{ background:"#f5f0f1", border:"none", borderRadius:6, padding:"5px 9px", cursor:"pointer", display:"flex", alignItems:"center", color:"#555" }}><Eye size={13}/></button>
                          {isAdmin && f.fine_status !== "paid" && f.fine_status !== "waived" && (
                            <button onClick={() => setMarkPaidFine(f)} title="Update status"
                              style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:6, padding:"5px 9px", cursor:"pointer", display:"flex", alignItems:"center", color:"#15803d" }}><CheckCircle2 size={13}/></button>
                          )}
                          {isAdmin && (
                            <button onClick={() => setEditFine(f)} title="Edit"
                              style={{ background:"#fff5f7", border:"1px solid #f9c0c0", borderRadius:6, padding:"5px 9px", cursor:"pointer", display:"flex", alignItems:"center", color:"#800020" }}><Pencil size={13}/></button>
                          )}
                          {isAdmin && (
                            <button onClick={() => setConfirmDelete(f)} title="Delete"
                              style={{ background:"#fff5f5", border:"1px solid #fca5a5", borderRadius:6, padding:"5px 9px", cursor:"pointer", display:"flex", alignItems:"center", color:"#dc2626" }}><Trash2 size={13}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#fff9f7", borderTop:"2px solid #f9e0e4" }}>
                  <td colSpan={3} style={{ padding:"10px 14px", fontSize:12, fontWeight:700, color:"#800020" }}>
                    {filtered.length} fine{filtered.length!==1?"s":""} — filtered total
                  </td>
                  <td style={{ padding:"10px 14px", fontWeight:800, color:"#800020", fontSize:14, whiteSpace:"nowrap" }}>
                    UGX {fmt(filteredTotal)}
                  </td>
                  <td colSpan={4} style={{ padding:"10px 14px", fontSize:12, color:"#888" }}>
                    Unpaid: <strong style={{ color:"#dc2626" }}>UGX {fmt(filtered.filter(f=>f.fine_status==="unpaid").reduce((a,f)=>a+Number(f.amount),0))}</strong>
                    &nbsp;·&nbsp;
                    Paid: <strong style={{ color:"#15803d" }}>UGX {fmt(filtered.filter(f=>f.fine_status==="paid").reduce((a,f)=>a+Number(f.amount),0))}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderTop:"1px solid #f3f4f6", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:13, color:"#888" }}>
              Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}
            </span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{ padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===1?"not-allowed":"pointer",color:page===1?"#ccc":"#111",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:4 }}><ChevronLeft size={14}/>Prev</button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1)acc.push("..."); acc.push(p); return acc; },[])
                .map((p,i)=>p==="..."
                  ?<span key={`d${i}`} style={{padding:"6px 4px",color:"#aaa",fontSize:13}}>…</span>
                  :<button key={p} onClick={()=>setPage(p)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid",borderColor:page===p?"#800020":"#e5e7eb",background:page===p?"#800020":"#fff",color:page===p?"#fff":"#111",fontWeight:700,cursor:"pointer",fontSize:13}}>{p}</button>
                )}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===totalPages?"not-allowed":"pointer",color:page===totalPages?"#ccc":"#111",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:4 }}>Next<ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals */}
      {showAdd && (
        <Modal title="Issue Fine" onClose={() => setShowAdd(false)}>
          <FineForm members={members} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </Modal>
      )}

      {editFine && (
        <Modal title="Edit Fine" onClose={() => setEditFine(null)}>
          <FineForm
            initial={{ ...editFine, member_id: String(editFine.member_id) }}
            members={members} onSave={handleEdit} onCancel={() => setEditFine(null)} saving={saving}
          />
        </Modal>
      )}

      {viewFine && (
        <ViewFine
          fine={viewFine}
          memberName={getMemberName(viewFine.member_id)}
          onClose={() => setViewFine(null)}
          onEdit={() => { setEditFine(viewFine); setViewFine(null); }}
          onMarkPaid={() => { setMarkPaidFine(viewFine); setViewFine(null); }}
          isAdmin={isAdmin}
        />
      )}

      {markPaidFine && (
        <Modal title="Update Fine Status" onClose={() => setMarkPaidFine(null)}>
          <MarkPaidForm
            fine={markPaidFine}
            memberName={getMemberName(markPaidFine.member_id)}
            onSave={handleMarkPaid}
            onCancel={() => setMarkPaidFine(null)}
            saving={saving}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Fine" onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
            <AlertTriangle size={40} color="#dc2626" style={{marginBottom:12}}/>
            <p style={{ fontSize:16, color:"#111", fontWeight:600, margin:"0 0 6px" }}>Delete this fine?</p>
            <p style={{ fontSize:14, color:"#800020", fontWeight:700, margin:"0 0 4px" }}>
              UGX {fmt(confirmDelete.amount)} — {getMemberName(confirmDelete.member_id)}
            </p>
            <p style={{ fontSize:13, color:"#888", margin:"0 0 24px" }}>This cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding:"10px 24px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",fontWeight:600,cursor:"pointer",fontSize:14 }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding:"10px 24px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14 }}>Yes, Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}