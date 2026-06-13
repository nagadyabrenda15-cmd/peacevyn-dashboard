import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const ROLES = ["admin","finance","treat_staff","staff","member"];
const ROLE_COLORS = {
  admin:       "#800020",
  finance:     "#15803d",
  treat_staff: "#7e22ce",
  staff:       "#2563eb",
  member:      "#ca8a04",
};

function Badge({ role }) {
  return (
    <span style={{
      background: `${ROLE_COLORS[role] || "#6b7280"}20`,
      color: ROLE_COLORS[role] || "#6b7280",
      fontSize:11, fontWeight:700, padding:"3px 10px",
      borderRadius:99, textTransform:"capitalize", whiteSpace:"nowrap",
    }}>{role || "—"}</span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px",borderBottom:"1px solid #f0f0f0",position:"sticky",top:0,background:"#fff",zIndex:1,borderRadius:"16px 16px 0 0"}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#111",fontFamily:"Georgia, serif"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888"}}>×</button>
        </div>
        <div style={{padding:"20px 24px 28px"}}>{children}</div>
      </div>
    </div>
  );
}

const inp = {padding:"10px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:14,outline:"none",color:"#111",background:"#fafafa",fontFamily:"sans-serif",width:"100%",boxSizing:"border-box"};
const sel = {...inp, cursor:"pointer"};

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users,    setUsers]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");
  const [toast,    setToast]    = useState(null);

  const [showCreate,   setShowCreate]   = useState(false);
  const [editUser,     setEditUser]     = useState(null); // for role change
  const [resetUser,    setResetUser]    = useState(null); // for password reset
  const [createForm,   setCreateForm]   = useState({ email:"", password:"", role:"member", member_id:"" });
  const [newPassword,  setNewPassword]  = useState("");
  const [showPwd,      setShowPwd]      = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    // Fetch user_profiles joined with members info
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, role");
    const { data: membersList } = await supabase
      .from("members")
      .select("id, full_name, member_number, user_id, email");

    // Build combined user list
    const combined = (profiles || []).map(p => {
      const linkedMember = (membersList||[]).find(m => m.user_id === p.id);
      return {
        id:     p.id,
        role:   p.role,
        member: linkedMember || null,
        email:  linkedMember?.email || p.id,
      };
    });

    setUsers(combined);
    setMembers(membersList || []);
    setLoading(false);
  }

  function showToast(msg, type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3500); }

  // ── Create new user via Supabase Admin API
  async function handleCreate() {
    const e = {};
    if (!createForm.email.trim())    e.email    = "Required";
    if (!createForm.password || createForm.password.length < 6) e.password = "Min 6 characters";
    if (!createForm.role)            e.role     = "Required";
    setCreateErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    // Use Supabase signUp — works without admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email:             createForm.email.trim(),
      password:          createForm.password,
      email_confirm:     true, // auto-confirm so they can login immediately
    });

    if (error) {
      // Fallback: if admin API not available, guide manually
      showToast(`Could not create via API: ${error.message}. Create user in Supabase dashboard then assign role here.`, "error");
      setSaving(false);
      return;
    }

    const newUserId = data.user.id;

    // Insert into user_profiles
    await supabase.from("user_profiles").insert([{ id: newUserId, role: createForm.role }]);

    // Link to member if selected
    if (createForm.member_id) {
      await supabase.from("members")
        .update({ user_id: newUserId })
        .eq("id", Number(createForm.member_id));
    }

    setSaving(false);
    showToast(`User created successfully! They can now log in with their email and password.`);
    setShowCreate(false);
    setCreateForm({ email:"", password:"", role:"member", member_id:"" });
    loadAll();
  }

  // ── Update role
  async function handleRoleUpdate(userId, newRole) {
    setSaving(true);
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ id: userId, role: newRole });
    setSaving(false);
    if (error) { showToast(error.message,"error"); return; }
    showToast("Role updated successfully!");
    setEditUser(null);
    loadAll();
  }

  // ── Reset password via Supabase Admin API
  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters","error"); return;
    }
    setSaving(true);
    const { error } = await supabase.auth.admin.updateUserById(resetUser.id, {
      password: newPassword,
    });
    setSaving(false);
    if (error) {
      // If admin API fails (needs service role), show manual instruction
      if (error.message.includes("not authorized") || error.message.includes("service_role")) {
        showToast("Admin API requires service_role key. See instructions below.", "error");
      } else {
        showToast(error.message, "error");
      }
      return;
    }
    showToast(`Password updated for ${resetUser.member?.full_name || resetUser.email}!`);
    setResetUser(null);
    setNewPassword("");
  }

  // ── Send password reset email
  async function handleSendResetEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    if (error) { showToast(error.message,"error"); return; }
    showToast(`Password reset email sent to ${email}!`);
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q ||
      u.member?.full_name?.toLowerCase().includes(q) ||
      u.member?.member_number?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q);
  });

  // Unlinked members (no user_id yet)
  const unlinkedMembers = members.filter(m => !m.user_id);

  return (
    <div style={{background:"#f8f7f5",minHeight:"100vh",padding:"20px 16px",fontFamily:"sans-serif"}}>

      {toast && (
        <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="error"?"#dc2626":"#15803d",color:"#fff",padding:"12px 20px",borderRadius:10,fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",maxWidth:320,lineHeight:1.5}}>
          {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}input:focus,select:focus{border-color:#800020!important;box-shadow:0 0 0 3px rgba(128,0,32,0.08);outline:none;}tr:hover td{background:#fff9f9!important;}`}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#800020",fontFamily:"Georgia, serif"}}>User Management</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>
            {users.length} users · {unlinkedMembers.length} members not yet linked to a login
          </p>
        </div>
        <button onClick={()=>setShowCreate(true)} style={{background:"#800020",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:14}}>
          + Create User
        </button>
      </div>

      {/* Stats strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:20}}>
        {ROLES.map(r=>{
          const count = users.filter(u=>u.role===r).length;
          return (
            <div key={r} style={{background:"#fff",borderRadius:10,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",borderLeft:`3px solid ${ROLE_COLORS[r]||"#888"}`}}>
              <div style={{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4}}>{r}</div>
              <div style={{fontSize:22,fontWeight:800,color:ROLE_COLORS[r]||"#111",marginTop:2}}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Unlinked members warning */}
      {unlinkedMembers.length > 0 && (
        <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13}}>
          <strong style={{color:"#a16207"}}>⚠ {unlinkedMembers.length} member{unlinkedMembers.length!==1?"s":""} have no login yet:</strong>
          <span style={{color:"#555",marginLeft:6}}>{unlinkedMembers.map(m=>m.full_name).join(", ")}</span>
          <span style={{color:"#888",marginLeft:8}}>— use "+ Create User" to set them up.</span>
        </div>
      )}

      {/* Search */}
      <div style={{background:"#fff",borderRadius:12,padding:"12px 16px",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#aaa"}}>🔍</span>
          <input placeholder="Search by name, number, email or role…" value={search}
            onChange={e=>setSearch(e.target.value)} style={{...inp,paddingLeft:32}}/>
        </div>
        {search && <button onClick={()=>setSearch("")} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"8px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>✕</button>}
      </div>

      {/* Table */}
      <div style={{background:"#fff",borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflow:"hidden"}}>
        {loading ? (
          <div style={{padding:48,textAlign:"center"}}>
            <div style={{width:32,height:32,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
            <p style={{color:"#aaa",margin:0}}>Loading users…</p>
          </div>
        ) : filtered.length===0 ? (
          <div style={{padding:"48px 20px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>👤</div>
            <p style={{color:"#888",margin:0}}>No users found.</p>
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
              <thead>
                <tr style={{background:"#800020"}}>
                  {["#","Member","Email / ID","Role","Linked Member","Actions"].map(h=>(
                    <th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:0.6,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u,i)=>(
                  <tr key={u.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                    <td style={{padding:"11px 14px",color:"#bbb",fontSize:12}}>{i+1}</td>
                    <td style={{padding:"11px 14px"}}>
                      <div style={{fontWeight:700,color:"#111",whiteSpace:"nowrap"}}>
                        {u.member?.full_name || <span style={{color:"#aaa",fontStyle:"italic"}}>No member linked</span>}
                      </div>
                      {u.member && <div style={{fontSize:11,color:"#aaa"}}>{u.member.member_number}</div>}
                    </td>
                    <td style={{padding:"11px 14px",fontSize:12,color:"#555",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {u.member?.email || <span style={{color:"#aaa",fontSize:11}}>{u.id.slice(0,16)}…</span>}
                    </td>
                    <td style={{padding:"11px 14px"}}><Badge role={u.role}/></td>
                    <td style={{padding:"11px 14px",fontSize:12,color:u.member?"#555":"#dc2626"}}>
                      {u.member ? `${u.member.full_name} (${u.member.member_number})` : "⚠ Not linked"}
                    </td>
                    <td style={{padding:"11px 14px"}}>
                      <div style={{display:"flex",gap:6,flexWrap:"nowrap"}}>
                        {/* Change role */}
                        <button onClick={()=>setEditUser(u)}
                          title="Change role"
                          style={{background:"#fff5f7",border:"1px solid #f9c0c0",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600,color:"#800020",whiteSpace:"nowrap"}}>
                          🎭 Role
                        </button>
                        {/* Reset password */}
                        <button onClick={()=>setResetUser(u)}
                          title="Set password"
                          style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600,color:"#2563eb",whiteSpace:"nowrap"}}>
                          🔑 Password
                        </button>
                        {/* Send reset email */}
                        {u.member?.email && (
                          <button onClick={()=>handleSendResetEmail(u.member.email)}
                            title="Send password reset email"
                            style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600,color:"#15803d",whiteSpace:"nowrap"}}>
                            📧 Reset Email
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create User Modal */}
      {showCreate && (
        <Modal title="Create New User" onClose={()=>setShowCreate(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff5f7",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#800020",border:"1px solid #f9c0c0"}}>
              ℹ️ This creates a login account. Make sure to link it to a member so they can access their portal.
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Email <span style={{color:"#800020"}}>*</span></label>
              <input type="email" placeholder="member@example.com" value={createForm.email}
                onChange={e=>setCreateForm(f=>({...f,email:e.target.value}))} style={{...inp,...(createErrors.email?{borderColor:"#dc2626"}:{})}}/>
              {createErrors.email && <span style={{fontSize:11,color:"#dc2626"}}>{createErrors.email}</span>}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Password <span style={{color:"#800020"}}>*</span></label>
              <div style={{position:"relative"}}>
                <input type={showPwd?"text":"password"} placeholder="Min 6 characters" value={createForm.password}
                  onChange={e=>setCreateForm(f=>({...f,password:e.target.value}))}
                  style={{...inp,paddingRight:44,...(createErrors.password?{borderColor:"#dc2626"}:{})}}/>
                <button onClick={()=>setShowPwd(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#888",padding:0}}>
                  {showPwd?"🙈":"👁"}
                </button>
              </div>
              {createErrors.password && <span style={{fontSize:11,color:"#dc2626"}}>{createErrors.password}</span>}
              <span style={{fontSize:11,color:"#888"}}>Share this password with the member via WhatsApp/SMS</span>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Role <span style={{color:"#800020"}}>*</span></label>
              <select value={createForm.role} onChange={e=>setCreateForm(f=>({...f,role:e.target.value}))} style={sel}>
                {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1).replace("_"," ")}</option>)}
              </select>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>Link to Member</label>
              <select value={createForm.member_id} onChange={e=>setCreateForm(f=>({...f,member_id:e.target.value}))} style={sel}>
                <option value="">— Select member (optional) —</option>
                {members.filter(m=>!m.user_id).map(m=><option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
              </select>
              <span style={{fontSize:11,color:"#888"}}>Only unlinked members shown. Links this login to their profile.</span>
            </div>

            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
              <button onClick={()=>setShowCreate(false)} style={{padding:"10px 20px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#555",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{padding:"10px 24px",borderRadius:8,border:"none",background:saving?"#c0606f":"#800020",color:"#fff",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:14}}>
                {saving?"Creating…":"Create User"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Change Role Modal */}
      {editUser && (
        <Modal title="Change User Role" onClose={()=>setEditUser(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"#fafafa",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#111"}}>{editUser.member?.full_name || "Unknown user"}</div>
              <div style={{fontSize:12,color:"#888",marginTop:2}}>{editUser.member?.email || editUser.id}</div>
              <div style={{marginTop:6}}><Badge role={editUser.role}/></div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>New Role</label>
              <select defaultValue={editUser.role}
                onChange={e=>setEditUser(u=>({...u,newRole:e.target.value}))}
                style={sel}>
                {ROLES.map(r=>(
                  <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1).replace("_"," ")}</option>
                ))}
              </select>
            </div>

            <div style={{background:"#fff5f7",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#800020"}}>
              <strong>Role permissions:</strong><br/>
              admin → Full access · finance → Savings & Loans · treat_staff → Treat & Welfare · staff → View only · member → Own portal only
            </div>

            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setEditUser(null)} style={{padding:"10px 20px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#555",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancel</button>
              <button onClick={()=>handleRoleUpdate(editUser.id, editUser.newRole || editUser.role)} disabled={saving}
                style={{padding:"10px 24px",borderRadius:8,border:"none",background:saving?"#c0606f":"#800020",color:"#fff",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:14}}>
                {saving?"Saving…":"Update Role"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset Password Modal */}
      {resetUser && (
        <Modal title="Set Password" onClose={()=>{setResetUser(null);setNewPassword("");}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"linear-gradient(135deg,#800020,#b00030)",borderRadius:10,padding:"14px 16px",color:"#fff"}}>
              <div style={{fontSize:12,opacity:0.75}}>Setting password for</div>
              <div style={{fontSize:17,fontWeight:800,marginTop:2}}>{resetUser.member?.full_name || "Unknown user"}</div>
              <div style={{fontSize:12,opacity:0.75,marginTop:2}}>{resetUser.member?.email || resetUser.id}</div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:12,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.4}}>New Password</label>
              <div style={{position:"relative"}}>
                <input type={showPwd?"text":"password"} placeholder="Min 6 characters"
                  value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                  style={{...inp,paddingRight:44}}/>
                <button onClick={()=>setShowPwd(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#888",padding:0}}>
                  {showPwd?"🙈":"👁"}
                </button>
              </div>
              <span style={{fontSize:11,color:"#888"}}>Share this new password with the member via WhatsApp/SMS</span>
            </div>

            <div style={{background:"#eff6ff",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#1d4ed8"}}>
              📧 Alternatively — <strong>Send Reset Email</strong> to let the member set their own password via email link.
            </div>

            <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
              <button onClick={()=>{setResetUser(null);setNewPassword("");}} style={{padding:"10px 16px",borderRadius:8,border:"1.5px solid #e5e7eb",background:"#fff",color:"#555",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancel</button>
              {resetUser.member?.email && (
                <button onClick={()=>{handleSendResetEmail(resetUser.member.email);setResetUser(null);setNewPassword("");}}
                  style={{padding:"10px 16px",borderRadius:8,border:"none",background:"#15803d",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>
                  📧 Send Reset Email
                </button>
              )}
              <button onClick={handleResetPassword} disabled={saving}
                style={{padding:"10px 20px",borderRadius:8,border:"none",background:saving?"#c0606f":"#800020",color:"#fff",fontWeight:700,cursor:saving?"not-allowed":"pointer",fontSize:14}}>
                {saving?"Setting…":"Set Password"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
