import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAY_METHODS = ["cash","mobile_money","bank_transfer","cheque","other"];

function getMonthStart(year, month) {
  return `${year}-${String(month + 1).padStart(2,"0")}-01`;
}

function formatMonthLabel(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function PaidBadge({ paid }) {
  return (
    <span style={{
      background: paid ? "#dcfce7" : "#fee2e2",
      color: paid ? "#15803d" : "#dc2626",
      fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap",
    }}>
      {paid ? "✓ Cleared" : "✗ Not Cleared"}
    </span>
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
      <div style={{ width:44,height:44,borderRadius:10,background:`${accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>{label}</div>
        <div style={{ fontSize:20,fontWeight:800,color:"#111",fontFamily:"Georgia, serif" }}>{value}</div>
        {sub && <div style={{ fontSize:11,color:"#aaa",marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px",borderBottom:"1px solid #f0f0f0",position:"sticky",top:0,background:"#fff",zIndex:1,borderRadius:"16px 16px 0 0"}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#111",fontFamily:"Georgia, serif"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888"}}>×</button>
        </div>
        <div style={{padding:"20px 24px 28px"}}>{children}</div>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
      <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>
        {label}{required && <span style={{color:"#800020"}}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inp = {padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:14,outline:"none",color:"#111",background:"#fafafa",fontFamily:"sans-serif",width:"100%",boxSizing:"border-box"};
const sel = {...inp, cursor:"pointer"};

// ─── Contribution Form ────────────────────────────────────────────────────────
function ContributionForm({ initial, members, selectedMonth, onSave, onCancel, saving }) {
  const now = new Date();
  const [form, setForm] = useState({
    member_id:          initial?.member_id ? String(initial.member_id) : "",
    amount:             initial?.amount ? String(initial.amount) : "",
    payment_method:     initial?.payment_method || "cash",
    notes:              initial?.notes || "",
    contribution_month: initial?.contribution_month || selectedMonth || getMonthStart(now.getFullYear(), now.getMonth()),
  });
  const [errors, setErrors] = useState({});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function validate() {
    const e = {};
    if (!form.member_id)                          e.member_id = "Required";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Enter a valid amount";
    if (!form.contribution_month)                 e.contribution_month = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const err = (k) => errors[k] ? {borderColor:"#dc2626"} : {};

  return (
    <div>
      <Field label="Member" required>
        <select value={form.member_id} onChange={e=>set("member_id",e.target.value)}
          style={{...sel,...err("member_id")}}>
          <option value="">— Select member —</option>
          {members.map(m=><option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
        </select>
        {errors.member_id && <span style={{fontSize:11,color:"#dc2626"}}>{errors.member_id}</span>}
      </Field>

      <Field label="Contribution Month" required>
        <input type="month"
          value={form.contribution_month?.slice(0,7) || ""}
          onChange={e=>set("contribution_month", e.target.value + "-01")}
          style={{...inp,...err("contribution_month")}}/>
        {errors.contribution_month && <span style={{fontSize:11,color:"#dc2626"}}>{errors.contribution_month}</span>}
      </Field>

      <Field label="Amount (UGX)" required>
        <input type="number" min="0" placeholder="e.g. 10000" value={form.amount}
          onChange={e=>set("amount",e.target.value)}
          style={{...inp,...err("amount")}}/>
        {errors.amount && <span style={{fontSize:11,color:"#dc2626"}}>{errors.amount}</span>}
      </Field>

      <Field label="Payment Method">
        <select value={form.payment_method} onChange={e=>set("payment_method",e.target.value)} style={sel}>
          {PAY_METHODS.map(m=><option key={m}>{m}</option>)}
        </select>
      </Field>

      <Field label="Notes">
        <textarea rows={2} placeholder="Optional…" value={form.notes}
          onChange={e=>set("notes",e.target.value)} style={{...inp,resize:"vertical"}}/>
      </Field>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onCancel} style={{padding:"10px 20px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#555",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancel</button>
        <button onClick={()=>{if(validate())onSave(form);}} disabled={saving} style={{padding:"10px 24px",borderRadius:8,border:"none",background:saving?"#c0606f":"#800020",color:"#fff",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:14}}>
          {saving?"Saving…":"Save Contribution"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WELFARE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Welfare() {
  const { role } = useAuth();
  const isAdmin  = role === "admin";

  const [contributions, setContributions] = useState([]);
  const [members,       setMembers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  // Selected month for the monthly view
  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-indexed

  const [viewMode,      setViewMode]      = useState("monthly"); // "monthly" | "all"
  const [search,        setSearch]        = useState("");
  const [page,          setPage]          = useState(1);
  const PER_PAGE = 12;

  const [showAdd,       setShowAdd]       = useState(false);
  const [editRecord,    setEditRecord]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [ctRes, mbRes] = await Promise.all([
      supabase.from("welfare_contributions").select("*").order("contribution_month",{ascending:false}),
      supabase.from("members").select("id,full_name,member_number,member_status"),
    ]);
    setContributions(ctRes.data || []);
    setMembers(mbRes.data || []);
    setLoading(false);
  }

  function showToast(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3200); }

  async function handleAdd(form) {
    setSaving(true);
    const { error } = await supabase.from("welfare_contributions").insert([{
      member_id:          Number(form.member_id),
      amount:             Number(form.amount),
      payment_method:     form.payment_method,
      notes:              form.notes || null,
      contribution_month: form.contribution_month,
    }]);
    setSaving(false);
    if (error) { showToast(error.message,"error"); return; }
    showToast("Contribution recorded!");
    setShowAdd(false);
    loadAll();
  }

  async function handleEdit(form) {
    setSaving(true);
    const { error } = await supabase.from("welfare_contributions").update({
      member_id:          Number(form.member_id),
      amount:             Number(form.amount),
      payment_method:     form.payment_method,
      notes:              form.notes || null,
      contribution_month: form.contribution_month,
    }).eq("id", editRecord.id);
    setSaving(false);
    if (error) { showToast(error.message,"error"); return; }
    showToast("Contribution updated!");
    setEditRecord(null);
    loadAll();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("welfare_contributions").delete().eq("id",id);
    if (error) { showToast(error.message,"error"); return; }
    showToast("Record deleted.");
    setConfirmDelete(null);
    loadAll();
  }

  const getMemberName   = (id) => members.find(m=>m.id===id)?.full_name    || `Member #${id}`;
  const getMemberNumber = (id) => members.find(m=>m.id===id)?.member_number || "";

  // ── Selected month string e.g. "2026-06-01"
  const selectedMonthStr = getMonthStart(selYear, selMonth);

  // ── Contributions for selected month
  const monthContribs = contributions.filter(c =>
    c.contribution_month?.startsWith(selectedMonthStr.slice(0,7))
  );

  // ── Members who paid this month
  const paidMemberIds = new Set(monthContribs.map(c=>c.member_id));

  // ── KPIs for selected month
  const monthTotal      = monthContribs.reduce((a,c)=>a+Number(c.amount||0),0);
  const paidCount       = paidMemberIds.size;
  const notPaidCount    = members.length - paidCount;
  const collectionRate  = members.length > 0 ? Math.round((paidCount/members.length)*100) : 0;

  // ── All-time KPIs
  const totalFund       = contributions.reduce((a,c)=>a+Number(c.amount||0),0);
  const uniqueMonths    = [...new Set(contributions.map(c=>c.contribution_month?.slice(0,7)).filter(Boolean))];

  // ── Filter for all records view
  const filtered = contributions.filter(c => {
    const q = search.toLowerCase();
    const name = getMemberName(c.member_id).toLowerCase();
    const num  = getMemberNumber(c.member_id).toLowerCase();
    return !q || name.includes(q) || num.includes(q) ||
      formatMonthLabel(c.contribution_month).toLowerCase().includes(q);
  });

  const totalPages = Math.max(1,Math.ceil(filtered.length/PER_PAGE));
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  // ── Month navigation
  function prevMonth() {
    if (selMonth === 0) { setSelYear(y=>y-1); setSelMonth(11); }
    else setSelMonth(m=>m-1);
  }
  function nextMonth() {
    const isCurrentMonth = selYear===now.getFullYear() && selMonth===now.getMonth();
    if (isCurrentMonth) return;
    if (selMonth === 11) { setSelYear(y=>y+1); setSelMonth(0); }
    else setSelMonth(m=>m+1);
  }
  const isCurrentMonth = selYear===now.getFullYear() && selMonth===now.getMonth();

  return (
    <div style={{background:"#f8f7f5",minHeight:"100vh",padding:"20px 16px",fontFamily:"sans-serif"}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="error"?"#dc2626":"#15803d",color:"#fff",padding:"12px 20px",borderRadius:10,fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",animation:"slideIn 0.3s ease"}}>
          {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideIn{from{transform:translateX(40px);opacity:0;}to{transform:translateX(0);opacity:1;}}
        @keyframes spin{to{transform:rotate(360deg);}}
        tr:hover td{background:#fff9f9!important;}
        input:focus,select:focus,textarea:focus{border-color:#800020!important;box-shadow:0 0 0 3px rgba(128,0,32,0.08);outline:none;}
      `}</style>

      {/* ── Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#800020",fontFamily:"Georgia, serif"}}>Welfare Contributions</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>
            Monthly welfare fee tracking · {members.length} members · {uniqueMonths.length} months recorded
          </p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {/* View toggle */}
          <div style={{display:"flex",border:"1.5px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
            {[["monthly","📅 Monthly"],["all","☰ All Records"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{
                padding:"8px 14px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                background:viewMode===mode?"#800020":"#fff",
                color:viewMode===mode?"#fff":"#666",
              }}>{label}</button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={()=>setShowAdd(true)} style={{background:"#800020",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:14}}>
              + Add Contribution
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
        <KPICard icon="🤝" label="Total Fund"        value={`UGX ${fmt(totalFund)}`}       sub="all-time contributions"        accent="#800020"/>
        <KPICard icon="📅" label="This Month Paid"   value={`UGX ${fmt(monthTotal)}`}      sub={`${paidCount} of ${members.length} members`} accent="#15803d"/>
        <KPICard icon="✅" label="Cleared"            value={paidCount}                     sub={`paid for ${MONTHS[selMonth]}`} accent="#15803d"/>
        <KPICard icon="❌" label="Not Cleared"        value={notPaidCount}                  sub={`pending for ${MONTHS[selMonth]}`} accent="#dc2626"/>
        <KPICard icon="📊" label="Collection Rate"   value={`${collectionRate}%`}           sub={`${MONTHS[selMonth]} ${selYear}`} accent={collectionRate>=70?"#15803d":"#ca8a04"}/>
      </div>

      {/* ── Collection progress bar */}
      <div style={{background:"#fff",borderRadius:12,padding:"14px 18px",marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,color:"#555",marginBottom:6}}>
          <span>{MONTHS[selMonth]} {selYear} Collection</span>
          <span style={{color:"#800020"}}>{collectionRate}% — {paidCount}/{members.length} members</span>
        </div>
        <div style={{background:"#f0f0f0",borderRadius:6,height:10}}>
          <div style={{width:`${collectionRate}%`,height:10,borderRadius:6,background:collectionRate>=70?"#15803d":collectionRate>=40?"#ca8a04":"#dc2626",transition:"width 0.6s ease"}}/>
        </div>
      </div>

      {/* ════════════════ MONTHLY VIEW ════════════════ */}
      {viewMode === "monthly" && (
        <div>
          {/* Month navigator */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:12,padding:"12px 16px",marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <button onClick={prevMonth} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:700,fontSize:14,color:"#555"}}>← Prev</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:800,color:"#800020"}}>{MONTHS[selMonth]} {selYear}</div>
              <div style={{fontSize:12,color:"#888"}}>{paidCount} paid · {notPaidCount} pending</div>
            </div>
            <button onClick={nextMonth} disabled={isCurrentMonth} style={{background:isCurrentMonth?"#f9f9f9":"#f3f4f6",border:"none",borderRadius:8,padding:"8px 14px",cursor:isCurrentMonth?"not-allowed":"pointer",fontWeight:700,fontSize:14,color:isCurrentMonth?"#ccc":"#555"}}>Next →</button>
          </div>

          {/* Member list for this month */}
          {loading ? (
            <div style={{padding:40,textAlign:"center"}}>
              <div style={{width:32,height:32,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
              <p style={{color:"#aaa",margin:0}}>Loading…</p>
            </div>
          ) : (
            <div>
              {/* Not cleared section */}
              {notPaidCount > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#dc2626",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    <span>✗ Not Cleared ({notPaidCount})</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {members.filter(m=>!paidMemberIds.has(m.id)).map(m=>(
                      <div key={m.id} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #fee2e2",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:34,height:34,borderRadius:"50%",background:"#fee2e2",color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>
                            {m.full_name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:"#111"}}>{m.full_name}</div>
                            <div style={{fontSize:11,color:"#aaa"}}>{m.member_number}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <PaidBadge paid={false}/>
                          {isAdmin && (
                            <button onClick={()=>setShowAdd(true)} style={{background:"#800020",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:700}}>
                              + Pay
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cleared section */}
              {paidCount > 0 && (
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#15803d",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
                    ✓ Cleared ({paidCount})
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {monthContribs.map((c,i)=>{
                      const member = members.find(m=>m.id===c.member_id);
                      return (
                        <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #dcfce7",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:34,height:34,borderRadius:"50%",background:"#dcfce7",color:"#15803d",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>
                              {getMemberName(c.member_id).split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                            </div>
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:"#111"}}>{getMemberName(c.member_id)}</div>
                              <div style={{fontSize:11,color:"#aaa"}}>{getMemberNumber(c.member_id)} · {c.payment_method||"cash"}</div>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:14,fontWeight:800,color:"#15803d"}}>UGX {fmt(c.amount)}</div>
                              <PaidBadge paid={true}/>
                            </div>
                            {isAdmin && (
                              <div style={{display:"flex",gap:4}}>
                                <button onClick={()=>setEditRecord(c)} style={{background:"#fff5f7",border:"1px solid #f9c0c0",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>✏️</button>
                                <button onClick={()=>setConfirmDelete(c)} style={{background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>🗑</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {members.length === 0 && (
                <div style={{textAlign:"center",padding:"40px 0",color:"#aaa"}}>
                  <div style={{fontSize:36,marginBottom:8}}>👥</div>
                  <p style={{margin:0}}>No members found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ ALL RECORDS VIEW ════════════════ */}
      {viewMode === "all" && (
        <div>
          {/* Search */}
          <div style={{background:"#fff",borderRadius:12,padding:"12px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <div style={{position:"relative",flex:1}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#aaa"}}>🔍</span>
              <input placeholder="Search member, month…" value={search}
                onChange={e=>{setSearch(e.target.value);setPage(1);}}
                style={{...inp,paddingLeft:32}}/>
            </div>
            {search && <button onClick={()=>{setSearch("");setPage(1);}} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"8px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>✕</button>}
            <span style={{fontSize:13,color:"#888",whiteSpace:"nowrap"}}>{filtered.length} records</span>
          </div>

          {/* Table */}
          <div style={{background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflow:"hidden"}}>
            {loading ? (
              <div style={{padding:40,textAlign:"center"}}>
                <div style={{width:32,height:32,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
                <p style={{color:"#aaa",margin:0}}>Loading…</p>
              </div>
            ) : paginated.length===0 ? (
              <div style={{padding:"52px 20px",textAlign:"center"}}>
                <div style={{fontSize:42,marginBottom:10}}>🤝</div>
                <p style={{color:"#888",margin:0,fontSize:15}}>No contributions found.</p>
              </div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                  <thead>
                    <tr style={{background:"#800020"}}>
                      {["#","Member","Month","Amount","Method","Notes","Actions"].map(h=>(
                        <th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:0.6,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c,i)=>(
                      <tr key={c.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                        <td style={{padding:"11px 14px",color:"#bbb",fontSize:12}}>{(page-1)*PER_PAGE+i+1}</td>
                        <td style={{padding:"11px 14px"}}>
                          <div style={{fontWeight:700,color:"#111",whiteSpace:"nowrap"}}>{getMemberName(c.member_id)}</div>
                          <div style={{fontSize:11,color:"#aaa"}}>{getMemberNumber(c.member_id)}</div>
                        </td>
                        <td style={{padding:"11px 14px",fontWeight:600,color:"#800020",whiteSpace:"nowrap"}}>
                          {formatMonthLabel(c.contribution_month)}
                        </td>
                        <td style={{padding:"11px 14px",fontWeight:800,color:"#15803d",whiteSpace:"nowrap"}}>
                          UGX {fmt(c.amount)}
                        </td>
                        <td style={{padding:"11px 14px",fontSize:12,color:"#555",textTransform:"capitalize"}}>
                          {c.payment_method?.replace("_"," ")||"—"}
                        </td>
                        <td style={{padding:"11px 14px",fontSize:12,color:"#555",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {c.notes||"—"}
                        </td>
                        <td style={{padding:"11px 14px"}}>
                          {isAdmin && (
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>setEditRecord(c)} style={{background:"#fff5f7",border:"1px solid #f9c0c0",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:13}}>✏️</button>
                              <button onClick={()=>setConfirmDelete(c)} style={{background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:13}}>🗑</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:"#fff9f7",borderTop:"2px solid #f9e0e4"}}>
                      <td colSpan={3} style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:"#800020"}}>
                        {filtered.length} record{filtered.length!==1?"s":""}
                      </td>
                      <td style={{padding:"10px 14px",fontWeight:800,color:"#15803d",fontSize:14,whiteSpace:"nowrap"}}>
                        UGX {fmt(filtered.reduce((a,c)=>a+Number(c.amount||0),0))}
                      </td>
                      <td colSpan={3}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && filtered.length>PER_PAGE && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:"1px solid #f3f4f6",flexWrap:"wrap",gap:8}}>
                <span style={{fontSize:13,color:"#888"}}>Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    style={{padding:"6px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:page===1?"not-allowed":"pointer",color:page===1?"#ccc":"#111",fontWeight:600,fontSize:13}}>← Prev</button>
                  {Array.from({length:totalPages},(_,i)=>i+1)
                    .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                    .reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[])
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
        </div>
      )}

      {/* ── Modals */}
      {showAdd && (
        <Modal title="Add Welfare Contribution" onClose={()=>setShowAdd(false)}>
          <ContributionForm
            members={members}
            selectedMonth={selectedMonthStr}
            onSave={handleAdd}
            onCancel={()=>setShowAdd(false)}
            saving={saving}
          />
        </Modal>
      )}

      {editRecord && (
        <Modal title="Edit Contribution" onClose={()=>setEditRecord(null)}>
          <ContributionForm
            initial={editRecord}
            members={members}
            selectedMonth={selectedMonthStr}
            onSave={handleEdit}
            onCancel={()=>setEditRecord(null)}
            saving={saving}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Contribution" onClose={()=>setConfirmDelete(null)}>
          <div style={{textAlign:"center",padding:"8px 0 16px"}}>
            <div style={{fontSize:44,marginBottom:12}}>⚠️</div>
            <p style={{fontSize:16,color:"#111",fontWeight:600,margin:"0 0 6px"}}>Delete this contribution?</p>
            <p style={{fontSize:14,color:"#800020",fontWeight:700,margin:"0 0 4px"}}>
              UGX {fmt(confirmDelete.amount)} — {getMemberName(confirmDelete.member_id)}
            </p>
            <p style={{fontSize:13,color:"#888",margin:"0 0 4px"}}>{formatMonthLabel(confirmDelete.contribution_month)}</p>
            <p style={{fontSize:13,color:"#888",margin:"0 0 24px"}}>This cannot be undone.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setConfirmDelete(null)} style={{padding:"10px 24px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancel</button>
              <button onClick={()=>handleDelete(confirmDelete.id)} style={{padding:"10px 24px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>Yes, Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
