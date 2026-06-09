import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const TRANSACTION_TYPES = ["deposit", "withdrawal", "interest", "bonus", "correction"];
const PAYMENT_METHODS   = ["cash", "mobile_money", "bank_transfer", "cheque", "other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));

function Badge({ text, type }) {
  const map = {
    deposit:      ["#dcfce7", "#15803d"],
    withdrawal:   ["#fee2e2", "#dc2626"],
    interest:     ["#eff6ff", "#1d4ed8"],
    bonus:        ["#faf5ff", "#7e22ce"],
    correction:   ["#fff7ed", "#c2410c"],
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
      padding: "3px 10px", borderRadius: 99, textTransform: "capitalize",
      whiteSpace: "nowrap",
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
        width: 44, height: 44, borderRadius: 10,
        background: `${accent}18`,
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
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 620,
        maxHeight: "90vh", overflowY: "auto",
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
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
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

// ─── Savings Form ─────────────────────────────────────────────────────────────
const EMPTY = {
  member_id: "", amount: "", transaction_type: "deposit",
  payment_method: "cash", transaction_refrence: "",
  saving_date: new Date().toISOString().split("T")[0],
  notes: "", saving_package_id: "", created_at: new Date().toISOString().split("T")[0],
};

function SavingsForm({ initial = EMPTY, members = [], packages = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  // When member changes → auto-fill their saving package
  function handleMemberChange(memberId) {
    const selectedMember = members.find(m => String(m.id) === String(memberId));
    setForm(f => ({
      ...f,
      member_id: memberId,
      saving_package_id: selectedMember?.saving_package_id
        ? String(selectedMember.saving_package_id)
        : f.saving_package_id,
    }));
    setErrors(e => ({ ...e, member_id: "", saving_package_id: "" }));
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Get the auto-filled package name for display
  const autoPackage = packages.find(p => String(p.id) === String(form.saving_package_id));

  function validate() {
    const e = {};
    if (!form.member_id)        e.member_id = "Required";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = "Enter a valid amount";
    if (!form.saving_package_id) e.saving_package_id = "Required";
    if (!form.saving_date)      e.saving_date = "Required";
    if (!form.created_at)       e.created_at = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div>
      {/* Section: Transaction */}
      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1 }}>
        Transaction Details
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Field label="Member" required>
          <select value={form.member_id} onChange={e => handleMemberChange(e.target.value)}
            style={{ ...sel, ...(errors.member_id ? { borderColor: "#dc2626" } : {}) }}>
            <option value="">— Select member —</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
          </select>
          {errors.member_id && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.member_id}</span>}
        </Field>

        <Field label="Savings Package">
          {/* Read-only — auto filled from member's assigned package */}
          <input
            type="text"
            readOnly
            value={autoPackage ? autoPackage.package_name : form.member_id ? "No package assigned" : "Select a member first"}
            style={{ ...inp, background: "#f3f4f6", color: autoPackage ? "#800020" : "#aaa", fontWeight: autoPackage ? 700 : 400, cursor: "not-allowed" }}
          />
          {autoPackage && (
            <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>
              ✓ Auto-filled from member profile
            </span>
          )}
          {errors.saving_package_id && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.saving_package_id}</span>}
        </Field>

        <Field label="Amount (UGX)" required>
          <input type="number" min="0" placeholder="0" value={form.amount}
            onChange={e => set("amount", e.target.value)}
            style={{ ...inp, ...(errors.amount ? { borderColor: "#dc2626" } : {}) }} />
          {errors.amount && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.amount}</span>}
        </Field>

        <Field label="Transaction Type">
          <select value={form.transaction_type} onChange={e => set("transaction_type", e.target.value)} style={sel}>
            {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Payment Method">
          <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} style={sel}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>

        <Field label="Reference / Receipt No.">
          <input type="text" placeholder="e.g. TXN-00123" value={form.transaction_refrence}
            onChange={e => set("transaction_refrence", e.target.value)} style={inp} />
        </Field>

        <Field label="Saving Date" required>
          <input type="date" value={form.saving_date}
            onChange={e => set("saving_date", e.target.value)}
            style={{ ...inp, ...(errors.saving_date ? { borderColor: "#dc2626" } : {}) }} />
          {errors.saving_date && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.saving_date}</span>}
        </Field>

        <Field label="Record Date" required>
          <input type="date" value={form.created_at}
            onChange={e => set("created_at", e.target.value)}
            style={{ ...inp, ...(errors.created_at ? { borderColor: "#dc2626" } : {}) }} />
          {errors.created_at && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.created_at}</span>}
        </Field>
      </div>

      <Field label="Notes">
        <textarea rows={3} placeholder="Optional remarks…" value={form.notes}
          onChange={e => set("notes", e.target.value)}
          style={{ ...inp, resize: "vertical" }} />
      </Field>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb",
          background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer", fontSize: 14,
        }}>Cancel</button>
        <button onClick={() => { if (validate()) onSave(form); }} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: saving ? "#c0606f" : "#800020", color: "#fff",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14,
        }}>{saving ? "Saving…" : "Save Record"}</button>
      </div>
    </div>
  );
}

// ─── View Record Modal ────────────────────────────────────────────────────────
function ViewRecord({ record, memberName, packageName, onClose, onEdit, isAdmin }) {
  const typeColor = record.transaction_type === "withdrawal" ? "#dc2626" : "#15803d";
  const sign      = record.transaction_type === "withdrawal" ? "−" : "+";

  const rows = [
    ["Member", memberName],
    ["Savings Package", packageName],
    ["Transaction Type", <Badge text={record.transaction_type} />],
    ["Payment Method", <Badge text={record.payment_method} />],
    ["Reference", record.transaction_refrence || "—"],
    ["Saving Date", record.saving_date ? new Date(record.saving_date).toLocaleDateString() : "—"],
    ["Record Date", record.created_at ? new Date(record.created_at).toLocaleDateString() : "—"],
    ["Notes", record.notes || "—"],
  ];

  return (
    <Modal title="Savings Record" onClose={onClose}>
      {/* Amount hero */}
      <div style={{
        background: "linear-gradient(135deg, #800020, #b00030)",
        borderRadius: 12, padding: "20px 24px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Amount
          </div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Georgia, serif", marginTop: 4 }}>
            UGX {fmt(record.amount)}
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 }}>
            Record #{record.id}
          </div>
        </div>
        <div style={{ fontSize: 44, opacity: 0.25 }}>💰</div>
      </div>

      {/* Details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#f3f4f6", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        {rows.map(([label, val], i) => (
          <div key={i} style={{ background: "#fff", padding: "10px 14px", gridColumn: i >= rows.length - 1 ? "span 2" : "span 1" }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onEdit} style={{
            background: "#800020", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}>✏️ Edit Record</button>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SAVINGS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Savings() {
  const { role } = useAuth();
  const isAdmin  = role === "admin";

  const [savings,  setSavings]  = useState([]);
  const [members,  setMembers]  = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [methodFilter,setMethodFilter]= useState("all");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [page,        setPage]        = useState(1);
  const PER_PAGE = 12;

  const [showAdd,       setShowAdd]       = useState(false);
  const [editRecord,    setEditRecord]    = useState(null);
  const [viewRecord,    setViewRecord]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [sv, mb, pk] = await Promise.all([
      supabase.from("savings").select("*").order("created_at", { ascending: false }),
      supabase.from("members").select("id, full_name, member_number, saving_package_id"),
      supabase.from("saving_packages").select("id, package_name"),
    ]);
    setSavings(sv.data || []);
    setMembers(mb.data || []);
    setPackages(pk.data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleAdd(form) {
    setSaving(true);
    const { error } = await supabase.from("savings").insert([{
      ...form,
      member_id: Number(form.member_id),
      saving_package_id: Number(form.saving_package_id),
      amount: Number(form.amount),
    }]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Savings record added!");
    setShowAdd(false);
    loadAll();
  }

  async function handleEdit(form) {
    setSaving(true);
    const { error } = await supabase.from("savings").update({
      ...form,
      member_id: Number(form.member_id),
      saving_package_id: Number(form.saving_package_id),
      amount: Number(form.amount),
    }).eq("id", editRecord.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Record updated!");
    setEditRecord(null);
    setViewRecord(null);
    loadAll();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("savings").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Record deleted.");
    setConfirmDelete(null);
    setViewRecord(null);
    loadAll();
  }

  // ── Lookups
  const getMemberName = (id) => {
    const m = members.find(m => m.id === id);
    return m ? `${m.full_name}` : `Member #${id}`;
  };
  const getMemberNumber = (id) => members.find(m => m.id === id)?.member_number || "";
  const getPackageName  = (id) => packages.find(p => p.id === id)?.package_name || `Pkg #${id}`;

  // ── KPIs
  const totalDeposits   = savings.filter(s => s.transaction_type !== "withdrawal").reduce((a, s) => a + Number(s.amount), 0);
  const totalWithdrawals= savings.filter(s => s.transaction_type === "withdrawal").reduce((a, s) => a + Number(s.amount), 0);
  const netBalance      = totalDeposits - totalWithdrawals;
  const todayStr        = new Date().toISOString().split("T")[0];
  const todayTotal      = savings.filter(s => s.saving_date === todayStr || s.created_at === todayStr)
                                  .reduce((a, s) => a + Number(s.amount), 0);
  const uniqueMembers   = new Set(savings.map(s => s.member_id)).size;

  // ── Filter
  const filtered = savings.filter(s => {
    const q = search.toLowerCase();
    const name = getMemberName(s.member_id).toLowerCase();
    const num  = getMemberNumber(s.member_id).toLowerCase();
    const matchSearch = !q || name.includes(q) || num.includes(q) ||
      s.transaction_refrence?.toLowerCase().includes(q) ||
      s.notes?.toLowerCase().includes(q) ||
      String(s.amount).includes(q);
    const matchType   = typeFilter   === "all" || s.transaction_type  === typeFilter;
    const matchMethod = methodFilter === "all" || s.payment_method    === methodFilter;
    const matchFrom   = !dateFrom || s.saving_date >= dateFrom || s.created_at >= dateFrom;
    const matchTo     = !dateTo   || s.saving_date <= dateTo   || s.created_at <= dateTo;
    return matchSearch && matchType && matchMethod && matchFrom && matchTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Filtered totals
  const filteredTotal = filtered.reduce((a, s) => a + Number(s.amount), 0);

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
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        tr:hover td { background: #fff9f9 !important; }
        input:focus, select:focus, textarea:focus { border-color: #800020 !important; box-shadow: 0 0 0 3px rgba(128,0,32,0.08); outline: none; }
      `}</style>

      {/* ── Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#800020", fontFamily: "Georgia, serif" }}>
            Savings
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            {savings.length} total records · {uniqueMembers} members saving
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{
            background: "#800020", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 20px", fontWeight: 700,
            cursor: "pointer", fontSize: 14,
          }}>+ New Record</button>
        )}
      </div>

      {/* ── KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KPICard icon="💰" label="Net Balance"     value={`UGX ${fmt(netBalance)}`}       sub="Deposits minus withdrawals" accent="#800020" />
        <KPICard icon="📥" label="Total Deposits"  value={`UGX ${fmt(totalDeposits)}`}    sub={`${savings.filter(s=>s.transaction_type!=="withdrawal").length} transactions`} accent="#15803d" />
        <KPICard icon="📤" label="Total Withdrawn" value={`UGX ${fmt(totalWithdrawals)}`} sub={`${savings.filter(s=>s.transaction_type==="withdrawal").length} transactions`} accent="#dc2626" />
        <KPICard icon="📅" label="Today's Activity" value={`UGX ${fmt(todayTotal)}`}      sub="Recorded today" accent="#1d4ed8" />
      </div>

      {/* ── Filters */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 16,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }}>🔍</span>
          <input placeholder="Search member, reference, notes…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inp, paddingLeft: 32 }} />
        </div>

        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          style={{ ...sel, flex: "0 1 150px" }}>
          <option value="all">All Types</option>
          {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>

        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
          style={{ ...sel, flex: "0 1 155px" }}>
          <option value="all">All Methods</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
        </select>

        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ ...inp, flex: "0 1 140px" }} title="From date" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ ...inp, flex: "0 1 140px" }} title="To date" />

        {(search || typeFilter !== "all" || methodFilter !== "all" || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setTypeFilter("all"); setMethodFilter("all"); setDateFrom(""); setDateTo(""); setPage(1); }}
            style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            ✕ Clear
          </button>
        )}

        <span style={{ fontSize: 13, color: "#888", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} · UGX {fmt(filteredTotal)}
        </span>
      </div>

      {/* ── Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #f0e8ea", borderTop: "3px solid #800020", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "#aaa", margin: 0 }}>Loading savings…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>📭</div>
            <p style={{ color: "#888", margin: 0, fontSize: 15 }}>No records match your search.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#800020" }}>
                  {["#", "Member", "Amount", "Type", "Method", "Reference", "Saving Date", "Package", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "12px 14px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: "#fff",
                      textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => {
                  const isWithdrawal = s.transaction_type === "withdrawal";
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "11px 14px", color: "#bbb", fontSize: 12 }}>
                        {(page - 1) * PER_PAGE + i + 1}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>{getMemberName(s.member_id)}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>{getMemberNumber(s.member_id)}</div>
                      </td>
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 800, color: isWithdrawal ? "#dc2626" : "#15803d", fontSize: 15 }}>
                          {isWithdrawal ? "−" : "+"}UGX {fmt(s.amount)}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}><Badge text={s.transaction_type} /></td>
                      <td style={{ padding: "11px 14px" }}><Badge text={s.payment_method} /></td>
                      <td style={{ padding: "11px 14px", color: "#555", fontSize: 12, fontFamily: "monospace" }}>
                        {s.transaction_refrence || <span style={{ color: "#ddd" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", color: "#555", fontSize: 12, whiteSpace: "nowrap" }}>
                        {s.saving_date ? new Date(s.saving_date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: "#555", fontSize: 12, whiteSpace: "nowrap" }}>
                        {getPackageName(s.saving_package_id)}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setViewRecord(s)} title="View"
                            style={{ background: "#f5f0f1", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>
                            👁
                          </button>
                          {isAdmin && (
                            <button onClick={() => setEditRecord(s)} title="Edit"
                              style={{ background: "#fff5f7", border: "1px solid #f9c0c0", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>
                              ✏️
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => setConfirmDelete(s)} title="Delete"
                              style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table footer totals */}
              <tfoot>
                <tr style={{ background: "#fff9f7", borderTop: "2px solid #f9e0e4" }}>
                  <td colSpan={2} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#800020" }}>
                    Page Total
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 800, color: "#800020", fontSize: 14 }}>
                    UGX {fmt(paginated.reduce((a, s) => a + Number(s.amount), 0))}
                  </td>
                  <td colSpan={6} style={{ padding: "10px 14px", fontSize: 12, color: "#888" }}>
                    Filtered total: <strong style={{ color: "#800020" }}>UGX {fmt(filteredTotal)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderTop: "1px solid #f3f4f6", flexWrap: "wrap", gap: 8,
          }}>
            <span style={{ fontSize: 13, color: "#888" }}>
              Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: page===1?"not-allowed":"pointer", color: page===1?"#ccc":"#111", fontWeight: 600, fontSize: 13 }}>
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_,i)=>i+1)
                .filter(p => p===1||p===totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1)acc.push("..."); acc.push(p); return acc; },[])
                .map((p,i)=> p==="..."
                  ? <span key={`d${i}`} style={{padding:"6px 4px",color:"#aaa",fontSize:13}}>…</span>
                  : <button key={p} onClick={()=>setPage(p)} style={{
                      padding:"6px 12px",borderRadius:6,border:"1px solid",
                      borderColor:page===p?"#800020":"#e5e7eb",
                      background:page===p?"#800020":"#fff",
                      color:page===p?"#fff":"#111",
                      fontWeight:700,cursor:"pointer",fontSize:13,
                    }}>{p}</button>
                )}
              <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: page===totalPages?"not-allowed":"pointer", color: page===totalPages?"#ccc":"#111", fontWeight: 600, fontSize: 13 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAdd && (
        <Modal title="New Savings Record" onClose={() => setShowAdd(false)}>
          <SavingsForm members={members} packages={packages} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </Modal>
      )}

      {editRecord && (
        <Modal title="Edit Savings Record" onClose={() => setEditRecord(null)}>
          <SavingsForm
            initial={{ ...editRecord, member_id: String(editRecord.member_id), saving_package_id: String(editRecord.saving_package_id) }}
            members={members} packages={packages}
            onSave={handleEdit} onCancel={() => setEditRecord(null)} saving={saving}
          />
        </Modal>
      )}

      {viewRecord && (
        <ViewRecord
          record={viewRecord}
          memberName={getMemberName(viewRecord.member_id)}
          packageName={getPackageName(viewRecord.saving_package_id)}
          onClose={() => setViewRecord(null)}
          onEdit={() => { setEditRecord(viewRecord); setViewRecord(null); }}
          isAdmin={isAdmin}
        />
      )}

      {confirmDelete && (
        <Modal title="Delete Record" onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 16, color: "#111", fontWeight: 600, margin: "0 0 6px" }}>
              Delete this savings record?
            </p>
            <p style={{ fontSize: 14, color: "#800020", fontWeight: 700, margin: "0 0 6px" }}>
              UGX {fmt(confirmDelete.amount)} — {getMemberName(confirmDelete.member_id)}
            </p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 24px" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                padding: "10px 24px", borderRadius: 8, border: "1.5px solid #e5e7eb",
                background: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{
                padding: "10px 24px", borderRadius: 8, border: "none",
                background: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
              }}>Yes, Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
