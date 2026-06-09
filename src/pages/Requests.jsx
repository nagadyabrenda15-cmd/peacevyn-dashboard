import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const fmt = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));
const today = () => new Date().toISOString().split("T")[0];

function Badge({ text }) {
  const map = {
    pending:   ["#fef9c3","#a16207"],
    approved:  ["#dcfce7","#15803d"],
    confirmed: ["#dcfce7","#15803d"],
    rejected:  ["#fee2e2","#dc2626"],
  };
  const [bg,fg] = map[text?.toLowerCase()] || ["#f3f4f6","#6b7280"];
  return <span style={{background:bg,color:fg,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,textTransform:"capitalize",whiteSpace:"nowrap"}}>{text||"—"}</span>;
}

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

const inp = {padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:14,outline:"none",color:"#111",background:"#fafafa",fontFamily:"sans-serif",width:"100%",boxSizing:"border-box"};

// ── Loan Request Approval ─────────────────────────────────────────────────────
function ApproveLoanModal({ request, memberName, onApprove, onReject, onCancel, saving }) {
  const [interestRate,  setInterestRate]  = useState("10");
  const [issueDate,     setIssueDate]     = useState(today());
  const [dueDate,       setDueDate]       = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [adminNotes,    setAdminNotes]    = useState("");

  const total = request.amount_requested * (1 + Number(interestRate)/100);

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#800020,#b00030)",borderRadius:12,padding:"16px 20px",marginBottom:20,color:"#fff"}}>
        <div style={{fontSize:12,opacity:0.75}}>Loan Request from</div>
        <div style={{fontSize:18,fontWeight:800,fontFamily:"Georgia, serif",marginTop:2}}>{memberName}</div>
        <div style={{fontSize:22,fontWeight:800,marginTop:4}}>UGX {fmt(request.amount_requested)}</div>
        <div style={{fontSize:12,opacity:0.75,marginTop:4}}>Reason: {request.reason} · {request.repayment_period}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Interest Rate (%)</label>
          <input type="number" min="0" value={interestRate} onChange={e=>setInterestRate(e.target.value)} style={inp} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Total to Pay</label>
          <input type="text" value={`UGX ${fmt(total)}`} readOnly style={{...inp,background:"#f3f4f6",color:"#800020",fontWeight:700}} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Issue Date</label>
          <input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} style={inp} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Due Date</label>
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={inp} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,gridColumn:"span 2"}}>
          <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Payment Method</label>
          <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} style={{...inp,cursor:"pointer"}}>
            {["cash","mobile_money","bank_transfer","cheque"].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,gridColumn:"span 2"}}>
          <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Admin Notes</label>
          <textarea rows={2} value={adminNotes} onChange={e=>setAdminNotes(e.target.value)} placeholder="Optional note to member…" style={{...inp,resize:"vertical"}} />
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={()=>onReject(adminNotes)} disabled={saving} style={{padding:"10px 18px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>✗ Reject</button>
        <button onClick={()=>onApprove({interestRate:Number(interestRate),total,issueDate,dueDate,paymentMethod,adminNotes})} disabled={saving||!dueDate} style={{padding:"10px 20px",borderRadius:8,border:"none",background:saving||!dueDate?"#c0606f":"#15803d",color:"#fff",fontWeight:700,cursor:saving||!dueDate?"not-allowed":"pointer",fontSize:14}}>
          {saving?"Processing…":"✓ Approve & Create Loan"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REQUESTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Requests() {
  const [loanReqs,    setLoanReqs]    = useState([]);
  const [depositReqs, setDepositReqs] = useState([]);
  const [treatReqs,   setTreatReqs]   = useState([]);
  const [members,     setMembers]     = useState([]);
  const [packages,    setPackages]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [activeTab,   setActiveTab]   = useState("loans");
  const [approveLoan, setApproveLoan] = useState(null);
  const [toast,       setToast]       = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [ln,dp,tr,mb,pk] = await Promise.all([
      supabase.from("loan_requests").select("*").order("created_at",{ascending:false}),
      supabase.from("savings_deposits").select("*").order("created_at",{ascending:false}),
      supabase.from("treat_requests").select("*").order("created_at",{ascending:false}),
      supabase.from("members").select("id,full_name,member_number,saving_package_id"),
      supabase.from("saving_packages").select("id,package_name"),
    ]);
    setLoanReqs(ln.data    || []);
    setDepositReqs(dp.data || []);
    setTreatReqs(tr.data   || []);
    setMembers(mb.data     || []);
    setPackages(pk.data    || []);
    setLoading(false);
  }

  function showToast(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3200); }

  const getMemberName   = (id) => members.find(m=>m.id===id)?.full_name    || `Member #${id}`;
  const getMemberNumber = (id) => members.find(m=>m.id===id)?.member_number || "";

  // ── APPROVE LOAN → auto-insert into loans table
  async function handleApproveLoan(req, { interestRate, total, issueDate, dueDate, paymentMethod, adminNotes }) {
    setSaving(true);
    // 1. Insert into loans table
    const { error: loanErr } = await supabase.from("loans").insert([{
      members_id:          req.member_id,
      loan_amount:         req.amount_requested,
      interest_rate:       interestRate,
      total_amount_to_pay: total,
      amount_paid:         0,
      balance:             total,
      loan_status:         "approved",
      issue_date:          issueDate,
      due_date:            dueDate,
      payment_method:      paymentMethod,
      notes:               adminNotes || null,
    }]);
    if (loanErr) { setSaving(false); showToast(loanErr.message,"error"); return; }
    // 2. Update request status
    await supabase.from("loan_requests").update({ status:"approved", admin_notes: adminNotes||null }).eq("id",req.id);
    setSaving(false);
    showToast("Loan approved and created successfully!");
    setApproveLoan(null);
    loadAll();
  }

  async function handleRejectLoan(req, adminNotes) {
    setSaving(true);
    await supabase.from("loan_requests").update({ status:"rejected", admin_notes: adminNotes||null }).eq("id",req.id);
    setSaving(false);
    showToast("Loan request rejected.");
    setApproveLoan(null);
    loadAll();
  }

  // ── CONFIRM DEPOSIT → auto-insert into savings table
  async function handleConfirmDeposit(dep) {
    setSaving(true);
    const member = members.find(m=>m.id===dep.member_id);
    const pkg    = packages.find(p=>p.id===member?.saving_package_id);
    // 1. Insert into savings
    const { error: svErr } = await supabase.from("savings").insert([{
      member_id:           dep.member_id,
      amount:              dep.amount,
      transaction_type:    "deposit",
      payment_method:      dep.payment_method,
      transaction_refrence:dep.reference || null,
      saving_date:         dep.deposit_date,
      notes:               dep.notes || "Confirmed deposit",
      created_at:          today(),
      saving_package_id:   member?.saving_package_id || pkg?.id || 1,
    }]);
    if (svErr) { setSaving(false); showToast(svErr.message,"error"); return; }
    // 2. Update deposit request
    await supabase.from("savings_deposits").update({ status:"confirmed", confirmed_at: new Date().toISOString() }).eq("id",dep.id);
    setSaving(false);
    showToast("Deposit confirmed and added to savings!");
    loadAll();
  }

  async function handleRejectDeposit(dep) {
    setSaving(true);
    await supabase.from("savings_deposits").update({ status:"rejected" }).eq("id",dep.id);
    setSaving(false);
    showToast("Deposit rejected.");
    loadAll();
  }

  // ── APPROVE TREAT WITHDRAWAL → auto-insert into treat table
  async function handleApproveTreat(req) {
    setSaving(true);
    // Get current balance
    const { data: txData } = await supabase.from("treat").select("balance_after").eq("member_id",req.member_id).order("created_at",{ascending:false}).limit(1);
    const currentBalance = txData && txData.length > 0 ? Number(txData[0].balance_after) : 0;
    if (req.amount > currentBalance) { setSaving(false); showToast("Insufficient balance in member's Treat account","error"); return; }
    const newBalance = currentBalance - req.amount;
    // 1. Insert withdrawal into treat
    const { error: trErr } = await supabase.from("treat").insert([{
      member_id:        req.member_id,
      account_number:   req.account_number,
      transaction_type: "withdrawal",
      amount:           req.amount,
      balance_after:    newBalance,
      payment_method:   "cash",
      notes:            req.reason || "Approved withdrawal",
      transaction_date: today(),
    }]);
    if (trErr) { setSaving(false); showToast(trErr.message,"error"); return; }
    // 2. Update request
    await supabase.from("treat_requests").update({ status:"approved" }).eq("id",req.id);
    setSaving(false);
    showToast("Treat withdrawal approved!");
    loadAll();
  }

  async function handleRejectTreat(req) {
    setSaving(true);
    await supabase.from("treat_requests").update({ status:"rejected" }).eq("id",req.id);
    setSaving(false);
    showToast("Treat withdrawal rejected.");
    loadAll();
  }

  const pendingLoans    = loanReqs.filter(r=>r.status==="pending").length;
  const pendingDeposits = depositReqs.filter(r=>r.status==="pending").length;
  const pendingTreats   = treatReqs.filter(r=>r.status==="pending").length;
  const totalPending    = pendingLoans + pendingDeposits + pendingTreats;

  const tabDefs = [
    { key:"loans",    label:"Loans",    count:pendingLoans,    color:"#2563eb" },
    { key:"deposits", label:"Deposits", count:pendingDeposits, color:"#15803d" },
    { key:"treat",    label:"Treat",    count:pendingTreats,   color:"#800020" },
    { key:"history",  label:"History",  count:0,               color:"#6b7280" },
  ];

  return (
    <div style={{background:"#f8f7f5",minHeight:"100vh",padding:"20px 16px",fontFamily:"sans-serif"}}>
      {toast && (
        <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="error"?"#dc2626":"#15803d",color:"#fff",padding:"12px 20px",borderRadius:10,fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",animation:"slideIn 0.3s ease"}}>
          {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
        </div>
      )}
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0;}to{transform:translateX(0);opacity:1;}}@keyframes spin{to{transform:rotate(360deg);}}tr:hover td{background:#fff9f9!important;}input:focus,select:focus,textarea:focus{border-color:#800020!important;box-shadow:0 0 0 3px rgba(128,0,32,0.08);outline:none;}`}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#800020",fontFamily:"Georgia, serif"}}>Requests Inbox</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>
            {totalPending > 0
              ? <span style={{color:"#dc2626",fontWeight:700}}>{totalPending} pending request{totalPending!==1?"s":""} need your attention</span>
              : "All requests are up to date ✓"}
          </p>
        </div>
        <button onClick={loadAll} style={{background:"#800020",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:600}}>↻ Refresh</button>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {tabDefs.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
            padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
            background:activeTab===t.key?t.color:"#fff",
            color:activeTab===t.key?"#fff":"#555",
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
            display:"flex",alignItems:"center",gap:6,
          }}>
            {t.label}
            {t.count>0 && <span style={{background:activeTab===t.key?"rgba(255,255,255,0.3)":"#dc2626",color:"#fff",fontSize:11,fontWeight:800,padding:"1px 7px",borderRadius:99}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{padding:48,textAlign:"center"}}>
          <div style={{width:32,height:32,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
          <p style={{color:"#aaa",margin:0}}>Loading requests…</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* LOAN REQUESTS */}
          {activeTab==="loans" && (
            loanReqs.length===0 ? (
              <Empty label="No loan requests yet" />
            ) : loanReqs.map(r=>(
              <RequestCard
                key={r.id}
                icon="📋" color="#2563eb"
                title={`Loan Request — UGX ${fmt(r.amount_requested)}`}
                member={getMemberName(r.member_id)} memberNo={getMemberNumber(r.member_id)}
                details={[`Period: ${r.repayment_period}`,`Reason: ${r.reason}`]}
                status={r.status} date={r.created_at} adminNotes={r.admin_notes}
                onApprove={r.status==="pending" ? ()=>setApproveLoan(r) : null}
                onReject={r.status==="pending"  ? ()=>handleRejectLoan(r,"") : null}
                saving={saving}
              />
            ))
          )}

          {/* DEPOSIT REQUESTS */}
          {activeTab==="deposits" && (
            depositReqs.length===0 ? (
              <Empty label="No deposit requests yet" />
            ) : depositReqs.map(r=>(
              <RequestCard
                key={r.id}
                icon="💰" color="#15803d"
                title={`Savings Deposit — UGX ${fmt(r.amount)}`}
                member={getMemberName(r.member_id)} memberNo={getMemberNumber(r.member_id)}
                details={[`Method: ${r.payment_method}`,r.reference?`Ref: ${r.reference}`:"",r.notes?`Note: ${r.notes}`:""].filter(Boolean)}
                status={r.status} date={r.created_at}
                onApprove={r.status==="pending" ? ()=>handleConfirmDeposit(r) : null}
                onReject={r.status==="pending"  ? ()=>handleRejectDeposit(r) : null}
                approveLabel="✓ Confirm Deposit"
                saving={saving}
              />
            ))
          )}

          {/* TREAT REQUESTS */}
          {activeTab==="treat" && (
            treatReqs.length===0 ? (
              <Empty label="No treat withdrawal requests yet" />
            ) : treatReqs.map(r=>(
              <RequestCard
                key={r.id}
                icon="🏦" color="#800020"
                title={`Treat Withdrawal — UGX ${fmt(r.amount)}`}
                member={getMemberName(r.member_id)} memberNo={getMemberNumber(r.member_id)}
                details={[`Account: ${r.account_number}`,r.reason?`Reason: ${r.reason}`:""].filter(Boolean)}
                status={r.status} date={r.created_at}
                onApprove={r.status==="pending" ? ()=>handleApproveTreat(r) : null}
                onReject={r.status==="pending"  ? ()=>handleRejectTreat(r) : null}
                saving={saving}
              />
            ))
          )}

          {/* HISTORY */}
          {activeTab==="history" && (
            <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"#800020"}}>
                      {["Type","Member","Amount","Status","Date"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:0.6,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...loanReqs.map(r=>({type:"Loan",member:getMemberName(r.member_id),amount:r.amount_requested,status:r.status,date:r.created_at})),
                      ...depositReqs.map(r=>({type:"Deposit",member:getMemberName(r.member_id),amount:r.amount,status:r.status,date:r.created_at})),
                      ...treatReqs.map(r=>({type:"Treat",member:getMemberName(r.member_id),amount:r.amount,status:r.status,date:r.created_at})),
                    ].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                        <td style={{padding:"9px 12px",color:"#555"}}>{r.type}</td>
                        <td style={{padding:"9px 12px",fontWeight:600,color:"#111"}}>{r.member}</td>
                        <td style={{padding:"9px 12px",fontWeight:700,color:"#800020",whiteSpace:"nowrap"}}>UGX {fmt(r.amount)}</td>
                        <td style={{padding:"9px 12px"}}><Badge text={r.status}/></td>
                        <td style={{padding:"9px 12px",color:"#888",fontSize:12,whiteSpace:"nowrap"}}>{r.date?new Date(r.date).toLocaleDateString():"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve Loan Modal */}
      {approveLoan && (
        <Modal title="Approve Loan Request" onClose={()=>setApproveLoan(null)}>
          <ApproveLoanModal
            request={approveLoan}
            memberName={getMemberName(approveLoan.member_id)}
            onApprove={(details)=>handleApproveLoan(approveLoan,details)}
            onReject={(notes)=>handleRejectLoan(approveLoan,notes)}
            onCancel={()=>setApproveLoan(null)}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  );
}

function Empty({ label }) {
  return (
    <div style={{textAlign:"center",padding:"48px 20px",background:"#fff",borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
      <div style={{fontSize:40,marginBottom:10}}>📭</div>
      <p style={{color:"#888",margin:0,fontSize:14}}>{label}</p>
    </div>
  );
}

function RequestCard({ icon, color, title, member, memberNo, details, status, date, adminNotes, onApprove, onReject, approveLabel="✓ Approve", saving }) {
  return (
    <div style={{background:"#fff",borderRadius:12,boxShadow:"0 2px 10px rgba(0,0,0,0.06)",overflow:"hidden",borderLeft:`4px solid ${color}`}}>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:6}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:38,height:38,borderRadius:10,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icon}</div>
            <div>
              <div style={{fontWeight:800,color:"#111",fontSize:14}}>{title}</div>
              <div style={{fontSize:12,color:"#888",marginTop:1}}>{member} · {memberNo}</div>
            </div>
          </div>
          <Badge text={status}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:adminNotes?8:0}}>
          {details.map((d,i)=><span key={i} style={{fontSize:12,color:"#666"}}>{d}</span>)}
          <span style={{fontSize:11,color:"#bbb"}}>{date?new Date(date).toLocaleString():"—"}</span>
        </div>
        {adminNotes && <div style={{fontSize:12,color:"#800020",background:"#fff5f7",borderRadius:6,padding:"6px 10px",marginBottom:8}}>Admin: {adminNotes}</div>}
        {(onApprove||onReject) && status==="pending" && (
          <div style={{display:"flex",gap:8,marginTop:10}}>
            {onReject && <button onClick={onReject} disabled={saving} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:"#fee2e2",color:"#dc2626",fontWeight:700,cursor:"pointer",fontSize:13}}>✗ Reject</button>}
            {onApprove && <button onClick={onApprove} disabled={saving} style={{flex:2,padding:"9px",borderRadius:8,border:"none",background:color,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>{saving?"Processing…":approveLabel}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
