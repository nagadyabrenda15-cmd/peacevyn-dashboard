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
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560,
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

// ─── Package Form ─────────────────────────────────────────────────────────────
const EMPTY = { package_name: "", minimum_saving: "", description: "" };

function PackageForm({ initial = EMPTY, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate() {
    const e = {};
    if (!form.package_name.trim())                           e.package_name = "Required";
    if (!form.minimum_saving || Number(form.minimum_saving) < 0) e.minimum_saving = "Enter a valid amount";
    if (!form.description.trim())                            e.description = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const err = (k) => errors[k] ? { borderColor: "#dc2626" } : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Package Name" required>
        <input type="text" placeholder="e.g. Gold Package" value={form.package_name}
          onChange={e => set("package_name", e.target.value)}
          style={{ ...inp, ...err("package_name") }} />
        {errors.package_name && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.package_name}</span>}
      </Field>

      <Field label="Minimum Saving (UGX)" required>
        <input type="number" min="0" placeholder="e.g. 50000" value={form.minimum_saving}
          onChange={e => set("minimum_saving", e.target.value)}
          style={{ ...inp, ...err("minimum_saving") }} />
        {errors.minimum_saving && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.minimum_saving}</span>}
        {form.minimum_saving > 0 && (
          <span style={{ fontSize: 11, color: "#800020", fontWeight: 600 }}>
            UGX {fmt(form.minimum_saving)} per period
          </span>
        )}
      </Field>

      <Field label="Description" required>
        <textarea rows={4} placeholder="Describe this savings package, its benefits, terms…"
          value={form.description} onChange={e => set("description", e.target.value)}
          style={{ ...inp, resize: "vertical", ...err("description") }} />
        {errors.description && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors.description}</span>}
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
        }}>{saving ? "Saving…" : "Save Package"}</button>
      </div>
    </div>
  );
}

// ─── Package Card (grid view) ─────────────────────────────────────────────────
function PackageCard({ pkg, memberCount, totalSavings, onView, onEdit, onDelete, isAdmin }) {
  const tier = ["#c0a060", "#aaaaaa", "#cd7f32"]; // gold, silver, bronze feel
  const accent = "#800020";

  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      overflow: "hidden", display: "flex", flexDirection: "column",
      border: "1px solid #f3e8ea",
      transition: "box-shadow 0.2s",
    }}>
      {/* Card header */}
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        padding: "18px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Savings Package
          </div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "Georgia, serif" }}>
            {pkg.package_name}
          </div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.15)", borderRadius: 10,
          padding: "6px 12px", textAlign: "center",
        }}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: 600 }}>MIN SAVING</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>UGX {fmt(pkg.minimum_saving)}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderBottom: "1px solid #f3f4f6",
      }}>
        <div style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Members</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#800020", marginTop: 2 }}>{memberCount}</div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Total Savings</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d", marginTop: 2 }}>UGX {fmt(totalSavings)}</div>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6 }}>
          {pkg.description}
        </p>
      </div>

      {/* Created */}
      <div style={{ padding: "0 16px 10px", fontSize: 11, color: "#bbb" }}>
        Created {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : "—"}
      </div>

      {/* Actions */}
      <div style={{
        padding: "10px 16px 14px",
        display: "flex", gap: 8, borderTop: "1px solid #f3f4f6",
      }}>
        <button onClick={onView} style={{
          flex: 1, padding: "8px", borderRadius: 7, border: "1px solid #e5e7eb",
          background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer", fontSize: 13,
        }}>👁 View</button>
        {isAdmin && (
          <>
            <button onClick={onEdit} style={{
              flex: 1, padding: "8px", borderRadius: 7, border: "1px solid #f9c0c0",
              background: "#fff5f7", color: "#800020", fontWeight: 600, cursor: "pointer", fontSize: 13,
            }}>✏️ Edit</button>
            <button onClick={onDelete} style={{
              padding: "8px 12px", borderRadius: 7, border: "1px solid #fca5a5",
              background: "#fff5f5", color: "#dc2626", fontWeight: 600, cursor: "pointer", fontSize: 13,
            }}>🗑</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── View Package Modal ───────────────────────────────────────────────────────
function ViewPackage({ pkg, memberCount, totalSavings, membersOnPackage, onClose, onEdit, isAdmin }) {
  return (
    <Modal title="Package Details" onClose={onClose}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg,#800020,#b00030)",
        borderRadius: 12, padding: "18px 22px", marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Savings Package</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, fontFamily: "Georgia, serif", marginTop: 4 }}>{pkg.package_name}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 6 }}>
            Minimum: UGX {fmt(pkg.minimum_saving)}
          </div>
        </div>
        <div style={{ fontSize: 40, opacity: 0.2 }}>📦</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#f3f4f6", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        {[
          ["Members Enrolled", memberCount],
          ["Total Savings",    `UGX ${fmt(totalSavings)}`],
          ["Minimum Saving",   `UGX ${fmt(pkg.minimum_saving)}`],
          ["Created",          pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : "—"],
        ].map(([label, val], i) => (
          <div key={i} style={{ background: "#fff", padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 15, color: "#111", fontWeight: 700 }}>{val}</div>
          </div>
        ))}
        <div style={{ background: "#fff", padding: "10px 14px", gridColumn: "span 2" }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>Description</div>
          <div style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>{pkg.description}</div>
        </div>
      </div>

      {/* Members list */}
      {membersOnPackage.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Enrolled Members
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
            {membersOnPackage.map((m, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 12px", background: "#fafafa", borderRadius: 8,
                border: "1px solid #f3f4f6", fontSize: 13,
              }}>
                <span style={{ fontWeight: 600, color: "#111" }}>{m.full_name}</span>
                <span style={{ color: "#888", fontSize: 12 }}>{m.member_number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onEdit} style={{
            padding: "10px 22px", borderRadius: 8, border: "none",
            background: "#800020", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}>✏️ Edit Package</button>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function SavingPackages() {
  const { role } = useAuth();
  const isAdmin  = role === "admin";

  const [packages,  setPackages]  = useState([]);
  const [members,   setMembers]   = useState([]);
  const [savings,   setSavings]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const [search,    setSearch]    = useState("");
  const [viewMode,  setViewMode]  = useState("grid"); // "grid" | "table"

  const [showAdd,       setShowAdd]       = useState(false);
  const [editPkg,       setEditPkg]       = useState(null);
  const [viewPkg,       setViewPkg]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [pkRes, mbRes, svRes] = await Promise.all([
      supabase.from("saving_packages").select("*").order("created_at", { ascending: true }),
      supabase.from("members").select("id, full_name, member_number, saving_package_id"),
      supabase.from("savings").select("saving_package_id, amount"),
    ]);
    setPackages(pkRes.data || []);
    setMembers(mbRes.data  || []);
    setSavings(svRes.data  || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleAdd(form) {
    setSaving(true);
    const { error } = await supabase.from("saving_packages").insert([{
      package_name:   form.package_name.trim(),
      minimum_saving: Number(form.minimum_saving),
      description:    form.description.trim(),
    }]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Package created!");
    setShowAdd(false);
    loadAll();
  }

  async function handleEdit(form) {
    setSaving(true);
    const { error } = await supabase.from("saving_packages").update({
      package_name:   form.package_name.trim(),
      minimum_saving: Number(form.minimum_saving),
      description:    form.description.trim(),
    }).eq("id", editPkg.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Package updated!");
    setEditPkg(null);
    setViewPkg(null);
    loadAll();
  }

  async function handleDelete(id) {
    // Check if members are enrolled
    const enrolled = members.filter(m => m.saving_package_id === id);
    if (enrolled.length > 0) {
      showToast(`Cannot delete — ${enrolled.length} member(s) enrolled in this package.`, "error");
      setConfirmDelete(null);
      return;
    }
    const { error } = await supabase.from("saving_packages").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Package deleted.");
    setConfirmDelete(null);
    loadAll();
  }

  // ── Per-package stats
  const getMemberCount  = (id) => members.filter(m => m.saving_package_id === id).length;
  const getTotalSavings = (id) => savings.filter(s => s.saving_package_id === id).reduce((a, s) => a + Number(s.amount), 0);
  const getMembers      = (id) => members.filter(m => m.saving_package_id === id);

  // ── KPIs
  const totalPackages  = packages.length;
  const totalEnrolled  = members.length;
  const totalSavingsAll= savings.reduce((a, s) => a + Number(s.amount), 0);
  const highestMin     = packages.reduce((max, p) => Math.max(max, Number(p.minimum_saving)), 0);
  const lowestMin      = packages.length ? packages.reduce((min, p) => Math.min(min, Number(p.minimum_saving)), Infinity) : 0;

  // ── Filter
  const filtered = packages.filter(p => {
    const q = search.toLowerCase();
    return !q || p.package_name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
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
        input:focus,select:focus,textarea:focus { border-color:#800020 !important; box-shadow:0 0 0 3px rgba(128,0,32,0.08); outline:none; }
        tr:hover td { background:#fff9f9 !important; }
      `}</style>

      {/* ── Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#800020", fontFamily:"Georgia, serif" }}>Saving Packages</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#888" }}>
            {packages.length} packages · {totalEnrolled} members enrolled
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {/* View toggle */}
          <div style={{ display:"flex", border:"1.5px solid #e5e7eb", borderRadius:8, overflow:"hidden" }}>
            {["grid","table"].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding:"8px 14px", border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
                background: viewMode === mode ? "#800020" : "#fff",
                color: viewMode === mode ? "#fff" : "#666",
              }}>{mode === "grid" ? "⊞ Grid" : "☰ Table"}</button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)} style={{
              background:"#800020", color:"#fff", border:"none",
              borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14,
            }}>+ New Package</button>
          )}
        </div>
      </div>

      {/* ── KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12, marginBottom:20 }}>
        <KPICard icon="📦" label="Total Packages"   value={totalPackages}              sub="saving tiers"                  accent="#800020" />
        <KPICard icon="👥" label="Total Enrolled"   value={totalEnrolled}              sub="members across all packages"   accent="#2563eb" />
        <KPICard icon="💰" label="Total Savings"    value={`UGX ${fmt(totalSavingsAll)}`} sub="across all packages"        accent="#15803d" />
        <KPICard icon="⬆️" label="Highest Minimum" value={`UGX ${fmt(highestMin)}`}   sub="most premium package"          accent="#7e22ce" />
        <KPICard icon="⬇️" label="Lowest Minimum"  value={`UGX ${fmt(lowestMin)}`}    sub="entry-level package"           accent="#ca8a04" />
      </div>

      {/* ── Search */}
      <div style={{
        background:"#fff", borderRadius:12, padding:"12px 16px",
        boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:16,
        display:"flex", gap:10, alignItems:"center",
      }}>
        <div style={{ position:"relative", flex:1 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }}>🔍</span>
          <input placeholder="Search packages by name or description…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, paddingLeft:32 }} />
        </div>
        {search && (
          <button onClick={() => setSearch("")}
            style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontSize:13, color:"#888", whiteSpace:"nowrap" }}>
          {filtered.length} package{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Loading */}
      {loading ? (
        <div style={{ padding:48, textAlign:"center" }}>
          <div style={{ width:32, height:32, border:"3px solid #f0e8ea", borderTop:"3px solid #800020", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
          <p style={{ color:"#aaa", margin:0 }}>Loading packages…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:"52px 20px", textAlign:"center", background:"#fff", borderRadius:12 }}>
          <div style={{ fontSize:42, marginBottom:10 }}>📦</div>
          <p style={{ color:"#888", margin:0, fontSize:15 }}>No packages found.</p>
          {isAdmin && <button onClick={() => setShowAdd(true)} style={{ marginTop:16, background:"#800020", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14 }}>+ Create First Package</button>}
        </div>

      ) : viewMode === "grid" ? (
        // ── Grid View
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
          {filtered.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              memberCount={getMemberCount(pkg.id)}
              totalSavings={getTotalSavings(pkg.id)}
              onView={() => setViewPkg(pkg)}
              onEdit={() => setEditPkg(pkg)}
              onDelete={() => setConfirmDelete(pkg)}
              isAdmin={isAdmin}
            />
          ))}
        </div>

      ) : (
        // ── Table View
        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
              <thead>
                <tr style={{ background:"#800020" }}>
                  {["#","Package Name","Min. Saving (UGX)","Members","Total Savings","Description","Created","Actions"].map(h => (
                    <th key={h} style={{
                      padding:"12px 14px", textAlign:"left",
                      fontSize:11, fontWeight:700, color:"#fff",
                      textTransform:"uppercase", letterSpacing:0.6, whiteSpace:"nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((pkg, i) => (
                  <tr key={pkg.id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                    <td style={{ padding:"11px 14px", color:"#bbb", fontSize:12 }}>{i+1}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ fontWeight:800, color:"#800020" }}>{pkg.package_name}</div>
                    </td>
                    <td style={{ padding:"11px 14px", fontWeight:700, color:"#111", whiteSpace:"nowrap" }}>
                      UGX {fmt(pkg.minimum_saving)}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      <span style={{ background:"#fff5f7", color:"#800020", fontWeight:800, fontSize:15, padding:"2px 10px", borderRadius:99 }}>
                        {getMemberCount(pkg.id)}
                      </span>
                    </td>
                    <td style={{ padding:"11px 14px", fontWeight:700, color:"#15803d", whiteSpace:"nowrap" }}>
                      UGX {fmt(getTotalSavings(pkg.id))}
                    </td>
                    <td style={{ padding:"11px 14px", color:"#555", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {pkg.description}
                    </td>
                    <td style={{ padding:"11px 14px", color:"#888", fontSize:12, whiteSpace:"nowrap" }}>
                      {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setViewPkg(pkg)} title="View"
                          style={{ background:"#f5f0f1", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>👁</button>
                        {isAdmin && (
                          <button onClick={() => setEditPkg(pkg)} title="Edit"
                            style={{ background:"#fff5f7", border:"1px solid #f9c0c0", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>✏️</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setConfirmDelete(pkg)} title="Delete"
                            style={{ background:"#fff5f5", border:"1px solid #fca5a5", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:"#fff9f7", borderTop:"2px solid #f9e0e4" }}>
                  <td colSpan={3} style={{ padding:"10px 14px", fontSize:12, fontWeight:700, color:"#800020" }}>Totals</td>
                  <td style={{ padding:"10px 14px", fontWeight:800, color:"#800020" }}>{totalEnrolled}</td>
                  <td style={{ padding:"10px 14px", fontWeight:800, color:"#15803d", whiteSpace:"nowrap" }}>UGX {fmt(totalSavingsAll)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals */}
      {showAdd && (
        <Modal title="New Saving Package" onClose={() => setShowAdd(false)}>
          <PackageForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </Modal>
      )}

      {editPkg && (
        <Modal title="Edit Package" onClose={() => setEditPkg(null)}>
          <PackageForm initial={editPkg} onSave={handleEdit} onCancel={() => setEditPkg(null)} saving={saving} />
        </Modal>
      )}

      {viewPkg && (
        <ViewPackage
          pkg={viewPkg}
          memberCount={getMemberCount(viewPkg.id)}
          totalSavings={getTotalSavings(viewPkg.id)}
          membersOnPackage={getMembers(viewPkg.id)}
          onClose={() => setViewPkg(null)}
          onEdit={() => { setEditPkg(viewPkg); setViewPkg(null); }}
          isAdmin={isAdmin}
        />
      )}

      {confirmDelete && (
        <Modal title="Delete Package" onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
            <p style={{ fontSize:16, color:"#111", fontWeight:600, margin:"0 0 6px" }}>
              Delete <strong>{confirmDelete.package_name}</strong>?
            </p>
            {getMemberCount(confirmDelete.id) > 0 ? (
              <p style={{ fontSize:13, color:"#dc2626", fontWeight:600, margin:"0 0 20px" }}>
                ⚠ {getMemberCount(confirmDelete.id)} member(s) are enrolled — cannot delete.
              </p>
            ) : (
              <p style={{ fontSize:13, color:"#888", margin:"0 0 24px" }}>
                This package has no enrolled members. This action cannot be undone.
              </p>
            )}
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding:"10px 24px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",fontWeight:600,cursor:"pointer",fontSize:14 }}>Cancel</button>
              {getMemberCount(confirmDelete.id) === 0 && (
                <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding:"10px 24px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14 }}>Yes, Delete</button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
