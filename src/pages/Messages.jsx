import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function Messages() {
  const [members,       setMembers]       = useState([]);
  const [allMessages,   setAllMessages]   = useState([]);
  const [selectedId,    setSelectedId]    = useState(null);
  const [reply,         setReply]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [search,        setSearch]        = useState("");
  const scrollRef = useRef(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedId, allMessages]);

  // Mark this member's unread messages as read when their thread is opened
  useEffect(() => {
    if (!selectedId) return;
    markThreadRead(selectedId);
  }, [selectedId]);

  async function markThreadRead(memberId) {
    await supabase
      .from("member_comments")
      .update({ read_by_admin: true })
      .eq("member_id", memberId)
      .eq("is_admin_reply", false)
      .eq("read_by_admin", false);
    // Reflect locally without a full reload
    setAllMessages(prev => prev.map(m =>
      m.member_id === memberId && !m.is_admin_reply ? { ...m, read_by_admin: true } : m
    ));
  }

  async function markThreadRead(memberId) {
  await supabase
    .from("member_comments")
    .update({ read_by_admin: true })
    .eq("member_id", memberId)
    .eq("is_admin_reply", false)
    .eq("read_by_admin", false);

  setAllMessages(prev => prev.map(m =>
    m.member_id === memberId && !m.is_admin_reply ? { ...m, read_by_admin: true } : m
  ));

  window.dispatchEvent(new Event("peacevyn:refresh-badges"));
  }

  async function loadAll() {
    setLoading(true);
    const [mbRes, msgRes] = await Promise.all([
      supabase.from("members").select("id,full_name,member_number"),
      supabase.from("member_comments").select("*").order("created_at",{ascending:true}),
    ]);
    setMembers(mbRes.data || []);
    setAllMessages(msgRes.data || []);
    setLoading(false);
  }

  // Build conversation list — one entry per member who has messaged
  const conversations = members
    .map(m => {
      const msgs = allMessages.filter(msg => msg.member_id === m.id);
      if (msgs.length === 0) return null;
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter(msg => !msg.is_admin_reply && !msg.read_by_admin).length;
      return { member: m, lastMessage: last, count: msgs.length, unread };
    })
    .filter(Boolean)
    .sort((a,b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

  const filteredConvos = conversations.filter(c => {
    const q = search.toLowerCase();
    return !q || c.member.full_name.toLowerCase().includes(q) || c.member.member_number.toLowerCase().includes(q);
  });

  const selectedMember = members.find(m => m.id === selectedId);
  const thread = allMessages.filter(m => m.member_id === selectedId);

  async function handleSendReply() {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    const member = members.find(m => m.id === selectedId);
    await supabase.from("member_comments").insert([{
      member_id:      selectedId,
      member_name:    member?.full_name,
      member_number:  member?.member_number,
      content:        reply.trim(),
      is_admin_reply: true,
    }]);
    setReply("");
    setSending(false);
    loadAll();
  }

  return (
    <div style={{background:"#f8f7f5",minHeight:"100vh",padding:"20px 16px",fontFamily:"sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}input:focus,textarea:focus{border-color:#800020!important;box-shadow:0 0 0 3px rgba(128,0,32,0.08);outline:none;}`}</style>

      <div style={{marginBottom:20}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#800020",fontFamily:"Georgia, serif"}}>Member Messages</h1>
        <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>
          {conversations.length} conversation{conversations.length!==1?"s":""}
          {conversations.some(c=>c.unread>0) && <span style={{color:"#dc2626",fontWeight:700}}> · {conversations.reduce((a,c)=>a+c.unread,0)} unread</span>}
        </p>
      </div>

      <div style={{display:"flex",gap:16,height:"calc(100vh - 160px)",minHeight:480}}>

        {/* ── Conversation list */}
        <div style={{width:280,flexShrink:0,background:"#fff",borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px",borderBottom:"1px solid #f3f4f6"}}>
            <input placeholder="Search member…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {loading ? (
              <div style={{padding:40,textAlign:"center"}}>
                <div style={{width:28,height:28,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
              </div>
            ) : filteredConvos.length===0 ? (
              <div style={{padding:"40px 20px",textAlign:"center",color:"#aaa",fontSize:13}}>No conversations yet.</div>
            ) : filteredConvos.map(c => (
              <button key={c.member.id} onClick={()=>setSelectedId(c.member.id)} style={{
                width:"100%",display:"flex",alignItems:"center",gap:10,
                padding:"12px 14px",border:"none",
                background: selectedId===c.member.id ? "#fff5f7" : "#fff",
                borderLeft: selectedId===c.member.id ? "3px solid #800020" : "3px solid transparent",
                borderBottom:"1px solid #f3f4f6", cursor:"pointer", textAlign:"left",
              }}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"#f0e8ea",color:"#800020",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>
                  {c.member.full_name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.member.full_name}</span>
                    {c.unread>0 && <span style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:800,padding:"1px 6px",borderRadius:99,flexShrink:0}}>{c.unread}</span>}
                  </div>
                  <div style={{fontSize:11,color:"#888",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {c.lastMessage.is_admin_reply ? "You: " : ""}{c.lastMessage.content}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Thread view */}
        <div style={{flex:1,background:"#fff",borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {!selectedId ? (
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"#aaa"}}>
              <div style={{fontSize:48,marginBottom:12}}>💬</div>
              <p style={{margin:0,fontSize:14}}>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div style={{padding:"14px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:"#800020",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0}}>
                  {selectedMember?.full_name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:"#111"}}>{selectedMember?.full_name}</div>
                  <div style={{fontSize:12,color:"#888"}}>{selectedMember?.member_number}</div>
                </div>
              </div>

              <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"18px"}}>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {thread.map((m,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:m.is_admin_reply?"flex-end":"flex-start"}}>
                      <div style={{
                        maxWidth:"60%",
                        background: m.is_admin_reply ? "#800020" : "#f3f4f6",
                        color: m.is_admin_reply ? "#fff" : "#111",
                        borderRadius: m.is_admin_reply ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                        padding:"10px 14px",
                      }}>
                        {!m.is_admin_reply && <div style={{fontSize:10,fontWeight:800,color:"#800020",marginBottom:3}}>{m.member_name}</div>}
                        <div style={{fontSize:13,lineHeight:1.5}}>{m.content}</div>
                        <div style={{fontSize:10,opacity:0.6,marginTop:4,textAlign:"right"}}>
                          {m.created_at?new Date(m.created_at).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{padding:"14px 18px",borderTop:"1px solid #f3f4f6",display:"flex",gap:10,alignItems:"flex-end"}}>
                <textarea rows={1} placeholder="Type your reply…" value={reply}
                  onChange={e=>setReply(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSendReply();}}}
                  style={{flex:1,border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 14px",fontSize:14,outline:"none",resize:"none",boxSizing:"border-box"}}/>
                <button onClick={handleSendReply} disabled={sending||!reply.trim()} style={{
                  background:sending||!reply.trim()?"#e5e7eb":"#800020",
                  color:sending||!reply.trim()?"#aaa":"#fff",
                  border:"none",borderRadius:8,padding:"10px 20px",
                  fontWeight:700,cursor:sending||!reply.trim()?"not-allowed":"pointer",fontSize:13,flexShrink:0,
                }}>{sending?"…":"Reply"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}