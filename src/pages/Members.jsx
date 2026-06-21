import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  Pencil, Eye, Trash2, Search, AlertTriangle, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

function Badge({ status }) {
  const map = {
    active:    ["#dcfce7", "#15803d"],
    inactive:  ["#f3f4f6", "#6b7280"],
    suspended: ["#fee2e2", "#dc2626"],
  };
  const [bg, fg] = map[status?.toLowerCase()] || ["#f3f4f6", "#6b7280"];
  return (
    <span style={{
      background: bg, color: fg, fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 99, textTransform: "capitalize",
      whiteSpace: "nowrap",
    }}>
      {status || "—"}
    </span>
  );
}

function Avatar({ name }) {
  const initials = name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";
  const hue = name ? name.charCodeAt(0) % 360 : 0;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: `hsl(${hue},40%,88%)`,
      color: `hsl(${hue},40%,35%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: 13, flexShrink: 0,
      border: "2px solid white",
    }}>
      {initials}
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
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        {/* Modal header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: "1px solid #f0f0f0",
          position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "16px 16px 0 0",
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#111", fontFamily: "Georgia, serif" }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, cursor: "pointer",
            color: "#888", lineHeight: 1, padding: "0 4px",
          }}>×</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
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

const inputStyle = {
  padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8,
  fontSize: 14, outline: "none", color: "#111", background: "#fafafa",
  fontFamily: "sans-serif", width: "100%", boxSizing: "border-box",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

// ─── Member Form (Add / Edit) ─────────────────────────────────────────────────
const EMPTY_FORM = {
  member_number: "", full_name: "", gender: "Male", contact: "",
  email: "", address: "", date_of_birth: "", national_id_number: "",
  next_of_kin_name: "", next_of_kin_contact: "",
  saving_package_id: "", member_status: "active",
};

function MemberForm({ initial = EMPTY_FORM, packages = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function validate() {
    const e = {};
    if (!form.member_number.trim()) e.member_number = "Required";
    if (!form.full_name.trim()) e.full_name = "Required";
    if (!form.contact.trim()) e.contact = "Required";
    if (!form.address.trim()) e.address = "Required";
    if (!form.date_of_birth) e.date_of_birth = "Required";
    if (!form.next_of_kin_name.trim()) e.next_of_kin_name = "Required";
    if (!form.next_of_kin_contact.trim()) e.next_of_kin_contact = "Required";
    if (!form.saving_package_id) e.saving_package_id = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (validate()) onSave(form);
  }

  const inp = (key, type = "text", placeholder = "") => (
    <>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        style={{ ...inputStyle, ...(errors[key] ? { borderColor: "#dc2626" } : {}) }}
      />
      {errors[key] && <span style={{ fontSize: 11, color: "#dc2626" }}>{errors[key]}</span>}
    </>
  );

  return (
    <div>
      {/* Personal Info */}
      <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1 }}>
        Personal Information
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Field label="Member Number" required>{inp("member_number", "text", "e.g. PV-001")}</Field>
        <Field label="Full Name" required>{inp("full_name", "text", "Full legal name")}</Field>
        <Field label="Gender" required>
          <select value={form.gender} onChange={e => set("gender", e.target.value)} style={selectStyle}>
            {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Date of Birth" required>{inp("date_of_birth", "date")}</Field>
        <Field label="National ID">{inp("national_id_number", "text", "Optional")}</Field>
        <Field label="Contact" required>{inp("contact", "tel", "+256 700 000 000")}</Field>
        <Field label="Email">{inp("email", "email", "email@example.com")}</Field>
        <Field label="Address" required>{inp("address", "text", "Town / Village / District")}</Field>
      </div>

      {/* Next of Kin */}
      <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1 }}>
        Next of Kin
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Field label="Next of Kin Name" required>{inp("next_of_kin_name", "text", "Full name")}</Field>
        <Field label="Next of Kin Contact" required>{inp("next_of_kin_contact", "tel", "+256 700 000 000")}</Field>
      </div>

      {/* Membership */}
      <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#800020", textTransform: "uppercase", letterSpacing: 1 }}>
        Membership
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <Field label="Savings Package" required>
          <select
            value={form.saving_package_id}
            onChange={e => set("saving_package_id", e.target.value)}
            style={{ ...selectStyle, ...(errors.saving_package_id ? { borderColor: "#dc2626" } : {}) }}
          >
            <option value="">— Select package —</option>
            {packages.map(p => (
              <option key={p.id} value={p.id}>{p.package_name || `Package #${p.id}`}</option>
            ))}
          </select>
          {errors.saving_package_id && <span style={{ fontSize: 11, color: "#dc2626" }}>Required</span>}
        </Field>
        <Field label="Status" required>
          <select value={form.member_status} onChange={e => set("member_status", e.target.value)} style={selectStyle}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb",
          background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer", fontSize: 14,
        }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: saving ? "#c0606f" : "#800020", color: "#fff",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: 14,
        }}>
          {saving ? "Saving…" : "Save Member"}
        </button>
      </div>
    </div>
  );
}

// ─── View Member Modal ────────────────────────────────────────────────────────
function ViewMember({ member, packageName, onClose, onEdit, isAdmin }) {
  const rows = [
    ["Member Number", member.member_number],
    ["Gender", member.gender],
    ["Date of Birth", member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : "—"],
    ["National ID", member.national_id_number || "—"],
    ["Contact", member.contact],
    ["Email", member.email || "—"],
    ["Address", member.address],
    ["Next of Kin", member.next_of_kin_name],
    ["Next of Kin Contact", member.next_of_kin_contact],
    ["Savings Package", packageName],
    ["Joined", member.created_at ? new Date(member.created_at).toLocaleDateString() : "—"],
  ];

  return (
    <Modal title="Member Profile" onClose={onClose}>
      {/* Profile header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "#fff5f7", borderRadius: 12, padding: "16px 20px", marginBottom: 20,
        border: "1px solid #f9e0e4",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#800020", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 22, fontFamily: "Georgia, serif", flexShrink: 0,
        }}>
          {member.full_name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
        </div>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#111", fontFamily: "Georgia, serif" }}>
            {member.full_name}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge status={member.member_status} />
            <span style={{ fontSize: 12, color: "#888" }}>{member.member_number}</span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#f3f4f6", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        {rows.map(([label, val], i) => (
          <div key={i} style={{ background: "#fff", padding: "10px 14px" }}>
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
            display:"flex", alignItems:"center", gap:8,
          }}>
            <Pencil size={15}/> Edit Member
          </button>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MEMBERS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Members() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [members, setMembers]       = useState([]);
  const [packages, setPackages]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [page, setPage]             = useState(1);
  const [showAdd, setShowAdd]       = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [viewMember, setViewMember] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast]           = useState(null);
  const PER_PAGE = 10;

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [membersRes, pkgRes] = await Promise.all([
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      supabase.from("saving_packages").select("id, package_name"),
    ]);
    setMembers(membersRes.data || []);
    setPackages(pkgRes.data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAdd(form) {
    setSaving(true);
    const { error } = await supabase.from("members").insert([{
      ...form,
      saving_package_id: Number(form.saving_package_id),
    }]);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Member added successfully!");
    setShowAdd(false);
    loadAll();
  }

  async function handleEdit(form) {
    setSaving(true);
    // Destructure out id and any read-only fields before updating
    const { id, created_at, user_id, ...updateData } = form;
    const { error } = await supabase.from("members")
      .update({ ...updateData, saving_package_id: Number(form.saving_package_id) })
      .eq("id", editMember.id);
    setSaving(false);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Member updated successfully!");
    setEditMember(null);
    setViewMember(null);
    loadAll();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    showToast("Member deleted.");
    setConfirmDelete(null);
    setViewMember(null);
    loadAll();
  }

  // ── Filter + Search
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.full_name?.toLowerCase().includes(q) ||
      m.member_number?.toLowerCase().includes(q) ||
      m.contact?.includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.address?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || m.member_status === statusFilter;
    const matchGender = genderFilter === "all" || m.gender === genderFilter;
    return matchSearch && matchStatus && matchGender;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function getPackageName(id) {
    return packages.find(p => p.id === id)?.package_name || `Package #${id}`;
  }

  // ── Stats
  const activeCount   = members.filter(m => m.member_status === "active").length;
  const inactiveCount = members.filter(m => m.member_status === "inactive").length;
  const suspendedCount= members.filter(m => m.member_status === "suspended").length;
  const maleCount     = members.filter(m => m.gender === "Male").length;
  const femaleCount   = members.filter(m => m.gender === "Female").length;

  return (
    <div style={{ background: "#f8f7f5", minHeight: "100vh", padding: "20px 16px", fontFamily: "sans-serif" }}>

      {/* ── Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "error" ? "#dc2626" : "#15803d",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease", display:"flex", alignItems:"center", gap:8,
        }}>
          {toast.type === "error" ? <XCircle size={16}/> : <CheckCircle2 size={16}/>}{toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        tr:hover td { background: #fff9f9 !important; }
        input:focus, select:focus { border-color: #800020 !important; box-shadow: 0 0 0 3px rgba(128,0,32,0.08); }
      `}</style>

      {/* ── Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#800020", fontFamily: "Georgia, serif" }}>
            Members
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            {members.length} total members registered
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{
            background: "#800020", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 20px", fontWeight: 700,
            cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6,
          }}>
            + Add Member
          </button>
        )}
      </div>

      {/* ── Stats Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", value: members.length, color: "#800020", bg: "#fff5f7" },
          { label: "Active", value: activeCount, color: "#15803d", bg: "#f0fdf4" },
          { label: "Inactive", value: inactiveCount, color: "#6b7280", bg: "#f9fafb" },
          { label: "Suspended", value: suspendedCount, color: "#dc2626", bg: "#fef2f2" },
          { label: "Male", value: maleCount, color: "#1d4ed8", bg: "#eff6ff" },
          { label: "Female", value: femaleCount, color: "#7e22ce", bg: "#faf5ff" },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg, borderRadius: 10, padding: "12px 14px",
            border: `1px solid ${s.color}20`,
          }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Search & Filters */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 16,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }}/>
          <input
            placeholder="Search by name, number, contact, email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...inputStyle, paddingLeft: 32, background: "#fafafa" }}
          />
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...selectStyle, flex: "0 1 140px" }}>
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        {/* Gender filter */}
        <select value={genderFilter} onChange={e => { setGenderFilter(e.target.value); setPage(1); }}
          style={{ ...selectStyle, flex: "0 1 130px" }}>
          <option value="all">All Genders</option>
          {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
        </select>

        {/* Result count */}
        <span style={{ fontSize: 13, color: "#888", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table */}
      <div style={{
        background: "#fff", borderRadius: 12,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #f0e8ea", borderTop: "3px solid #800020", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "#aaa", margin: 0 }}>Loading members…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <Search size={36} style={{marginBottom:12,opacity:0.3,color:"#800020"}}/>
            <p style={{ color: "#888", margin: 0, fontSize: 15 }}>No members match your search.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#800020" }}>
                  {["Member", "Number", "Gender", "Contact", "Address", "Package", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "12px 14px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: "#fff",
                      textTransform: "uppercase", letterSpacing: 0.6,
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    {/* Member name + avatar */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={m.full_name} />
                        <div>
                          <div style={{ fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>{m.full_name}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{m.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#555", whiteSpace: "nowrap" }}>{m.member_number}</td>
                    <td style={{ padding: "12px 14px", color: "#555" }}>{m.gender}</td>
                    <td style={{ padding: "12px 14px", color: "#555", whiteSpace: "nowrap" }}>{m.contact}</td>
                    <td style={{ padding: "12px 14px", color: "#555", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.address}</td>
                    <td style={{ padding: "12px 14px", color: "#555", whiteSpace: "nowrap" }}>{getPackageName(m.saving_package_id)}</td>
                    <td style={{ padding: "12px 14px" }}><Badge status={m.member_status} /></td>
                    <td style={{ padding: "12px 14px", color: "#888", fontSize: 12, whiteSpace: "nowrap" }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {/* View */}
                        <button
                          onClick={() => setViewMember(m)}
                          title="View profile"
                          style={{ background: "#f0f0f0", border: "none", borderRadius: 6, padding: "5px 9px", cursor: "pointer", display:"flex", alignItems:"center", color:"#555" }}
                        ><Eye size={13}/></button>
                        {/* Edit (admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => setEditMember(m)}
                            title="Edit member"
                            style={{ background: "#fff5f7", border: "1px solid #f9c0c0", borderRadius: 6, padding: "5px 9px", cursor: "pointer", display:"flex", alignItems:"center", color:"#800020" }}
                          ><Pencil size={13}/></button>
                        )}
                        {/* Delete (admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmDelete(m)}
                            title="Delete member"
                            style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 9px", cursor: "pointer", display:"flex", alignItems:"center", color:"#dc2626" }}
                          ><Trash2 size={13}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderTop: "1px solid #f3f4f6", flexWrap: "wrap", gap: 8,
          }}>
            <span style={{ fontSize: 13, color: "#888" }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#ccc" : "#111", fontWeight: 600, fontSize: 13, display:"flex", alignItems:"center", gap:4 }}
              ><ChevronLeft size={14}/>Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === "..." ? (
                  <span key={`dot-${i}`} style={{ padding: "6px 4px", color: "#aaa", fontSize: 13 }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)} style={{
                    padding: "6px 12px", borderRadius: 6, border: "1px solid",
                    borderColor: page === p ? "#800020" : "#e5e7eb",
                    background: page === p ? "#800020" : "#fff",
                    color: page === p ? "#fff" : "#111",
                    fontWeight: 700, cursor: "pointer", fontSize: 13,
                  }}>{p}</button>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#ccc" : "#111", fontWeight: 600, fontSize: 13, display:"flex", alignItems:"center", gap:4 }}
              >Next<ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Member Modal */}
      {showAdd && (
        <Modal title="Add New Member" onClose={() => setShowAdd(false)}>
          <MemberForm packages={packages} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </Modal>
      )}

      {/* ── Edit Member Modal */}
      {editMember && (
        <Modal title="Edit Member" onClose={() => setEditMember(null)}>
          <MemberForm
            initial={{ ...editMember, saving_package_id: String(editMember.saving_package_id) }}
            packages={packages}
            onSave={handleEdit}
            onCancel={() => setEditMember(null)}
            saving={saving}
          />
        </Modal>
      )}

      {/* ── View Member Modal */}
      {viewMember && (
        <ViewMember
          member={viewMember}
          packageName={getPackageName(viewMember.saving_package_id)}
          onClose={() => setViewMember(null)}
          onEdit={() => { setEditMember(viewMember); setViewMember(null); }}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Delete Confirm Modal */}
      {confirmDelete && (
        <Modal title="Delete Member" onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <AlertTriangle size={40} color="#dc2626" style={{marginBottom:12}}/>
            <p style={{ fontSize: 16, color: "#111", fontWeight: 600, margin: "0 0 6px" }}>
              Delete <strong>{confirmDelete.full_name}</strong>?
            </p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 24px" }}>
              This action cannot be undone. All associated records may be affected.
            </p>
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