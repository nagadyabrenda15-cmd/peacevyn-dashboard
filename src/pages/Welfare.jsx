import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));

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
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520,
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

// ─── Contribution Form ────────────────────────────────────────────────────────
const EMPTY = { member_id: "", amount: "" };

function ContributionForm({ initial = EMPTY, members = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.member_id)                              e.member_id = "Required";
    if (!form.amount || Number(form.amount) <= 0)     e.amount = "Enter a valid amount";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const err = (k) => errors[k] ? { borderColor: "#dc2626" } : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Member" required>
        <select value={form.member_id} onChange={e => set("member_id", e.target.value)}
          style={{ ...sel, ...err("member_id") }}>
          <option value="">— Select member —</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>
          ))}
        </select>
        {errors.member_id && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.member_id}</span>}
      </Field>

      <Field label="Amount (UGX)" required>
        <input type="number" min="0" placeholder="e.g. 10000" value={form.amount}
          onChange={e => set("amount", e.target.value)}
          style={{ ...inp, ...err("amount") }} />
        {errors.amount && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.amount}</span>}
        {form.amount > 0 && (
          <span style={{ fontSize: 11, color: "#800020", fontWeight: 600 }}>UGX {fmt(form.amount)}</span>
        )}
      </Field>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
        <button onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb",
          background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer", fontSize: 14,
        }}>Cancel</button>
        <button onClick={() => { if (validate()) onSave(form); }} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: saving ? "#c0606f" : "#800020", color: "#fff",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14,
        }}>{saving ? "Saving…" : "Save Contribution"}</button>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewContribution({ record, memberName, memberNumber, onClose, onEdit, isAdmin }) {
  return (
    <Modal title="Welfare Contribution" onClose={onClose}>
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 12, padding: "20px 24px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Contribution Amount</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Georgia, serif", marginTop: 4 }}>
            UGX {fmt(record.amount)}
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 }}>Record #{record.id}</div>
        </div>
        <div style={{ fontSize: 44, opacity: 0.2 }}>🤝</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#f3f4f6", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        {[
          ["Member Name",   memberName],
          ["Member Number", memberNumber],
          ["Amount",        `UGX ${fmt(record.amount)}`],
          ["Record ID",     `#${record.id}`],
        ].map(([label, val], i) => (
          <div key={i} style={{ background: "#fff", padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, color: "#111", fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onEdit} style={{
            padding: "10px 22px", borderRadius: 8, border: "none",
            background: "#800020", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}>✏️ Edit</button>
        </div>
      )}
    </Modal>
  );
}

// ─── Member Welfare Card (grid) ───────────────────────────────────────────────
function MemberCard({ member, total, contributionCount, onAdd, isAdmin }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      border: "1px solid #f3e8ea", overflow: "hidden",
    }}>
      {/* Top strip */}
      <div style={{ background: "#800020", height: 5 }} />

      <div style={{ padding: "16px" }}>
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "#f9e8ea", color: "#800020",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 16, flexShrink: 0,
          }}>
            {member.full_name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "#111", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {member.full_name}
            </div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{member.member_number}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: "#fff5f7", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Total</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#800020", marginTop: 2 }}>UGX {fmt(total)}</div>
          </div>
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Records</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d", marginTop: 2 }}>{contributionCount}</div>
          </div>
        </div>

        {isAdmin && (
          <button onClick={() => onAdd(member)} style={{
            width: "100%", padding: "8px", borderRadius: 7, border: "1.5px solid #800020",
            background: "#fff", color: "#800020", fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}>+ Add Contribution</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Welfare() {
  const { role } = useAuth();
  const isAdmin  = role === "admin";

  const [contributions, setContributions] = useState([]);
  const [members,       setMembers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  const [search,     setSearch]     = useState("");
  const [viewMode,   setViewMode]   = useState("table"); // "table" | "members"
  const [page,       setPage]       = useState(1);
  const PER_PAGE = 12;

  const [showAdd,       setShowAdd]       = useState(false);
  const [prefillMember, setPrefillMember] = useState(null);
  const [editRecord,    setEditRecord]    = useState(null);
  const [viewRecord,    setViewRecord]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [ctRes, mbRes] = await Promise.all([
      supabase.from("welfare_contributions").select("*").order("id", { ascending: false }),
      supabase.from("members").select("id, full_name, member_number, member_status"),
    ]);
    setContributions(ctRes.data || []);
    setMembers(mbRes.data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleAdd(form) {
    setSaving(true);
    const { error } = await supabase.from("welfare_contributions").insert([{
      member_id: Number(form.member_id),
      amount:    Number(form.amount),
    }]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Contribution recorded!");
    setShowAdd(false);
    setPrefillMember(null);
    loadAll();
  }

  async function handleEdit(form) {
    setSaving(true);
    const { error } = await supabase.from("welfare_contributions").update({
      member_id: Number(form.member_id),
      amount:    Number(form.amount),
    }).eq("id", editRecord.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Contribution updated!");
    setEditRecord(null);
    setViewRecord(null);
    loadAll();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("welfare_contributions").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Record deleted.");
    setConfirmDelete(null);
    setViewRecord(null);
    loadAll();
  }

  const getMemberName   = (id) => members.find(m => m.id === id)?.full_name    || `Member #${id}`;
  const getMemberNumber = (id) => members.find(m => m.id === id)?.member_number || "";

  // ── Per-member stats
  const getMemberTotal = (id) =>
    contributions.filter(c => c.member_id === id).reduce((a, c) => a + Number(c.amount || 0), 0);
  const getMemberCount = (id) =>
    contributions.filter(c => c.member_id === id).length;

  // ── KPIs
  const totalFund      = contributions.reduce((a, c) => a + Number(c.amount || 0), 0);
  const totalRecords   = contributions.length;
  const contributing   = new Set(contributions.map(c => c.member_id)).size;
  const notContributed = members.filter(m => !contributions.find(c => c.member_id === m.id)).length;
  const avgPerMember   = contributing > 0 ? totalFund / contributing : 0;
  const topContributor = members.reduce((top, m) => {
    const t = getMemberTotal(m.id);
    return t > (top?.total || 0) ? { name: m.full_name, total: t } : top;
  }, null);

  // ── Filter (table view)
  const filtered = contributions.filter(c => {
    const q = search.toLowerCase();
    const name = getMemberName(c.member_id).toLowerCase();
    const num  = getMemberNumber(c.member_id).toLowerCase();
    return !q || name.includes(q) || num.includes(q) || String(c.amount).includes(q);
  });

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const filteredTotal= filtered.reduce((a, c) => a + Number(c.amount || 0), 0);

  // ── Members view filter
  const filteredMembers = members.filter(m => {
    const q = search.toLowerCase();
    return !q || m.full_name.toLowerCase().includes(q) || m.member_number.toLowerCase().includes(q);
  });

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
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#800020", fontFamily:"Georgia, serif" }}>Welfare Contributions</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#888" }}>
            {totalRecords} records · {contributing} contributing members
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {/* View toggle */}
          <div style={{ display:"flex", border:"1.5px solid #e5e7eb", borderRadius:8, overflow:"hidden" }}>
            {[["table","☰ Records"],["members","👥 By Member"]].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding:"8px 14px", border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
                background: viewMode === mode ? "#800020" : "#fff",
                color: viewMode === mode ? "#fff" : "#666",
              }}>{label}</button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => { setPrefillMember(null); setShowAdd(true); }} style={{
              background:"#800020", color:"#fff", border:"none",
              borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14,
            }}>+ Add Contribution</button>
          )}
        </div>
      </div>

      {/* ── KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))", gap:12, marginBottom:20 }}>
        <KPICard icon="🤝" label="Welfare Fund"      value={`UGX ${fmt(totalFund)}`}       sub="total collected"                    accent="#800020" />
        <KPICard icon="✅" label="Contributing"      value={contributing}                   sub="members contributed"                accent="#15803d" />
        <KPICard icon="⚠️" label="Not Contributed"  value={notContributed}                 sub="members with no record"             accent="#dc2626" />
        <KPICard icon="📊" label="Avg per Member"   value={`UGX ${fmt(avgPerMember)}`}     sub="average contribution"               accent="#2563eb" />
        <KPICard icon="🏆" label="Top Contributor"  value={topContributor?.name || "—"}    sub={topContributor ? `UGX ${fmt(topContributor.total)}` : ""} accent="#7e22ce" />
      </div>

      {/* ── Fund progress (contributing vs not) */}
      <div style={{ background:"#fff", borderRadius:12, padding:"14px 18px", marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, color:"#555", marginBottom:6 }}>
          <span>Member Participation</span>
          <span style={{ color:"#800020" }}>
            {members.length > 0 ? Math.round((contributing / members.length) * 100) : 0}% of members contributing
          </span>
        </div>
        <div style={{ background:"#f0f0f0", borderRadius:6, height:10 }}>
          <div style={{
            width: members.length > 0 ? `${(contributing / members.length) * 100}%` : "0%",
            height:10, borderRadius:6, background:"#800020", transition:"width 0.6s ease",
          }} />
        </div>
        <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:"#800020" }} />
            <span style={{ color:"#555" }}>Contributing: <strong style={{ color:"#800020" }}>{contributing}</strong></span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:"#e5e7eb" }} />
            <span style={{ color:"#555" }}>Not yet: <strong style={{ color:"#888" }}>{notContributed}</strong></span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:"#15803d" }} />
            <span style={{ color:"#555" }}>Total records: <strong style={{ color:"#15803d" }}>{totalRecords}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Search */}
      <div style={{ background:"#fff", borderRadius:12, padding:"12px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:16, display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ position:"relative", flex:1 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }}>🔍</span>
          <input placeholder="Search member name or number…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inp, paddingLeft:32 }} />
        </div>
        {search && (
          <button onClick={() => { setSearch(""); setPage(1); }}
            style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize:13, color:"#888", whiteSpace:"nowrap" }}>
          {viewMode === "table" ? `${filtered.length} records · UGX ${fmt(filteredTotal)}` : `${filteredMembers.length} members`}
        </span>
      </div>

      {/* ── Content */}
      {loading ? (
        <div style={{ padding:48, textAlign:"center" }}>
          <div style={{ width:32, height:32, border:"3px solid #f0e8ea", borderTop:"3px solid #800020", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
          <p style={{ color:"#aaa", margin:0 }}>Loading contributions…</p>
        </div>

      ) : viewMode === "members" ? (
        // ── Members Grid View
        <div>
          {notContributed > 0 && (
            <div style={{ background:"#fff5f5", border:"1px solid #fca5a5", borderRadius:10, padding:"10px 16px", marginBottom:14, fontSize:13, color:"#dc2626", fontWeight:600 }}>
              ⚠ {notContributed} member{notContributed!==1?"s have":" has"} not made any welfare contribution yet.
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:14 }}>
            {filteredMembers.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                total={getMemberTotal(m.id)}
                contributionCount={getMemberCount(m.id)}
                onAdd={(member) => { setPrefillMember(member); setShowAdd(true); }}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>

      ) : (
        // ── Records Table View
        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          {paginated.length === 0 ? (
            <div style={{ padding:"52px 20px", textAlign:"center" }}>
              <div style={{ fontSize:42, marginBottom:10 }}>🤝</div>
              <p style={{ color:"#888", margin:0, fontSize:15 }}>No contributions found.</p>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
                <thead>
                  <tr style={{ background:"#800020" }}>
                    {["#","Member","Member No.","Amount (UGX)","Actions"].map(h => (
                      <th key={h} style={{
                        padding:"12px 14px", textAlign:"left",
                        fontSize:11, fontWeight:700, color:"#fff",
                        textTransform:"uppercase", letterSpacing:0.6, whiteSpace:"nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                      <td style={{ padding:"11px 14px", color:"#bbb", fontSize:12 }}>
                        {(page-1)*PER_PAGE+i+1}
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{
                            width:34, height:34, borderRadius:"50%",
                            background:"#f9e8ea", color:"#800020",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontWeight:800, fontSize:12, flexShrink:0,
                          }}>
                            {getMemberName(c.member_id).split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                          </div>
                          <span style={{ fontWeight:700, color:"#111", whiteSpace:"nowrap" }}>
                            {getMemberName(c.member_id)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px", color:"#888", fontSize:12 }}>
                        {getMemberNumber(c.member_id)}
                      </td>
                      <td style={{ padding:"11px 14px", fontWeight:800, color:"#800020", fontSize:15, whiteSpace:"nowrap" }}>
                        UGX {fmt(c.amount)}
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => setViewRecord(c)} title="View"
                            style={{ background:"#f5f0f1", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>👁</button>
                          {isAdmin && (
                            <button onClick={() => setEditRecord(c)} title="Edit"
                              style={{ background:"#fff5f7", border:"1px solid #f9c0c0", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>✏️</button>
                          )}
                          {isAdmin && (
                            <button onClick={() => setConfirmDelete(c)} title="Delete"
                              style={{ background:"#fff5f5", border:"1px solid #fca5a5", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:"#fff9f7", borderTop:"2px solid #f9e0e4" }}>
                    <td colSpan={3} style={{ padding:"10px 14px", fontSize:12, fontWeight:700, color:"#800020" }}>
                      Filtered total ({filtered.length} records)
                    </td>
                    <td style={{ padding:"10px 14px", fontWeight:800, color:"#800020", fontSize:15, whiteSpace:"nowrap" }}>
                      UGX {fmt(filteredTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > PER_PAGE && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderTop:"1px solid #f3f4f6", flexWrap:"wrap", gap:8 }}>
              <span style={{ fontSize:13, color:"#888" }}>
                Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}
              </span>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  style={{ padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===1?"not-allowed":"pointer",color:page===1?"#ccc":"#111",fontWeight:600,fontSize:13 }}>← Prev</button>
                {Array.from({length:totalPages},(_,i)=>i+1)
                  .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                  .reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1)acc.push("..."); acc.push(p); return acc; },[])
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
      )}

      {/* ── Modals */}
      {showAdd && (
        <Modal title="Add Welfare Contribution" onClose={() => { setShowAdd(false); setPrefillMember(null); }}>
          <ContributionForm
            initial={prefillMember ? { member_id: String(prefillMember.id), amount: "" } : EMPTY}
            members={members}
            onSave={handleAdd}
            onCancel={() => { setShowAdd(false); setPrefillMember(null); }}
            saving={saving}
          />
        </Modal>
      )}

      {editRecord && (
        <Modal title="Edit Contribution" onClose={() => setEditRecord(null)}>
          <ContributionForm
            initial={{ member_id: String(editRecord.member_id), amount: String(editRecord.amount) }}
            members={members}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            saving={saving}
          />
        </Modal>
      )}

      {viewRecord && (
        <ViewContribution
          record={viewRecord}
          memberName={getMemberName(viewRecord.member_id)}
          memberNumber={getMemberNumber(viewRecord.member_id)}
          onClose={() => setViewRecord(null)}
          onEdit={() => { setEditRecord(viewRecord); setViewRecord(null); }}
          isAdmin={isAdmin}
        />
      )}

      {confirmDelete && (
        <Modal title="Delete Contribution" onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
            <p style={{ fontSize:16, color:"#111", fontWeight:600, margin:"0 0 6px" }}>Delete this contribution?</p>
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