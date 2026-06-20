import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-UG").format(Math.round(Number(n) || 0));
const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

// ─── CSV Download ─────────────────────────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
  };
  const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Print helper ─────────────────────────────────────────────────────────────
function printTable(title, headers, rows, summary = []) {
  const summaryHTML = summary.length
    ? `<div class="summary">${summary.map(s => `<span><strong>${s.label}:</strong> ${s.value}</span>`).join("")}</div>`
    : "";
  const html = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: Georgia, serif; padding: 24px; color: #111; }
      h1 { color: #800020; font-size: 20px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #888; margin-bottom: 16px; }
      .summary { display:flex; gap:24px; flex-wrap:wrap; background:#fff5f7; border-left:4px solid #800020; padding:10px 16px; margin-bottom:16px; font-size:13px; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { background:#800020; color:#fff; padding:8px 10px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
      td { padding:7px 10px; border-bottom:1px solid #f0f0f0; }
      tr:nth-child(even) td { background:#fafafa; }
      @media print { body { padding:0; } }
    </style></head><body>
    <h1>${title}</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()} · PeaceVyn Community Savings & Credit</div>
    ${summaryHTML}
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
    </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function ReportCard({ icon, title, description, color, onGenerate, loading }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      border: "1px solid #f3e8ea", overflow: "hidden",
    }}>
      <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, padding: "16px 20px", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontSize: 28 }}>{icon}</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "Georgia, serif" }}>{title}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>{description}</div>
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {onGenerate && (
          <button onClick={onGenerate} disabled={loading} style={{
            width: "100%", padding: "10px", borderRadius: 8,
            border: `1.5px solid ${color}`, background: "#fff",
            color: color, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14, opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "Generating…" : "⚙ Generate Report"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ dateFrom, dateTo, setDateFrom, setDateTo, onApply, loading }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "12px 16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 16,
      display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>Date Range:</span>
      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
        style={inpStyle} />
      <span style={{ color: "#aaa", fontSize: 13 }}>to</span>
      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
        style={inpStyle} />
      <button onClick={onApply} disabled={loading} style={{
        background: "#800020", color: "#fff", border: "none", borderRadius: 7,
        padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13,
      }}>{loading ? "Loading…" : "Apply"}</button>
    </div>
  );
}

const inpStyle = {
  padding: "8px 10px", border: "1.5px solid #e5e7eb", borderRadius: 7,
  fontSize: 13, outline: "none", color: "#111", background: "#fafafa",
  fontFamily: "sans-serif",
};

// ─── Report Table ─────────────────────────────────────────────────────────────
function ReportTable({ title, headers, rows, summary, onCSV, onPrint }) {
  if (!rows || rows.length === 0) return (
    <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa" }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
      <p style={{ margin: 0 }}>No data for this period.</p>
    </div>
  );

  return (
    <div>
      {/* Summary strip */}
      {summary && summary.length > 0 && (
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14,
          background: "#fff5f7", borderLeft: "4px solid #800020",
          borderRadius: "0 8px 8px 0", padding: "10px 16px",
        }}>
          {summary.map((s, i) => (
            <div key={i} style={{ fontSize: 13 }}>
              <span style={{ color: "#888" }}>{s.label}: </span>
              <strong style={{ color: "#800020" }}>{s.value}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Export buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: "flex-end" }}>
        <button onClick={onCSV} style={{
          background: "#15803d", color: "#fff", border: "none", borderRadius: 7,
          padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>⬇ Download CSV</button>
        <button onClick={onPrint} style={{
          background: "#800020", color: "#fff", border: "none", borderRadius: 7,
          padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>🖨 Print / PDF</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #f3f4f6" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#800020" }}>
              {headers.map(h => (
                <th key={h} style={{
                  padding: "10px 12px", textAlign: "left", color: "#fff",
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: 0.6, whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "9px 12px", color: "#333", whiteSpace: "nowrap" }}>{cell ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: "#aaa", marginTop: 8, textAlign: "right" }}>
        {rows.length} record{rows.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Reports() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo,   setDateTo]   = useState(today());
  const [loading,  setLoading]  = useState(false);
  const [active,   setActive]   = useState(null); // which report is open

  // Data states
  const [savingsData,   setSavingsData]   = useState(null);
  const [loansData,     setLoansData]     = useState(null);
  const [finesData,     setFinesData]     = useState(null);
  const [welfareData,   setWelfareData]   = useState(null);
  const [treatData,     setTreatData]     = useState(null);
  const [membersData,   setMembersData]   = useState(null);
  const [monthlyData,   setMonthlyData]   = useState(null);

  // ── Load helpers
  async function loadSavings() {
    setLoading(true);
    const [sv, mb, pk] = await Promise.all([
      supabase.from("savings").select("*").gte("saving_date", dateFrom).lte("saving_date", dateTo).order("saving_date"),
      supabase.from("members").select("id, full_name, member_number"),
      supabase.from("saving_packages").select("id, package_name"),
    ]);
    const members  = mb.data  || [];
    const packages = pk.data  || [];
    const rows = (sv.data || []).map(s => {
      const m = members.find(m => m.id === s.member_id);
      const p = packages.find(p => p.id === s.saving_package_id);
      return [
        m?.member_number || "—",
        m?.full_name     || "—",
        `UGX ${fmt(s.amount)}`,
        s.transaction_type || "—",
        s.payment_method   || "—",
        s.transaction_refrence || "—",
        s.saving_date || "—",
        p?.package_name || "—",
        s.notes || "—",
      ];
    });
    const total    = (sv.data || []).reduce((a, s) => a + Number(s.amount), 0);
    const deposits = (sv.data || []).filter(s => s.transaction_type !== "withdrawal").reduce((a, s) => a + Number(s.amount), 0);
    const withdrawals = total - deposits;
    setSavingsData({
      rows,
      summary: [
        { label: "Total Records", value: rows.length },
        { label: "Total Deposits", value: `UGX ${fmt(deposits)}` },
        { label: "Total Withdrawals", value: `UGX ${fmt(withdrawals)}` },
        { label: "Net", value: `UGX ${fmt(deposits - withdrawals)}` },
      ],
    });
    setActive("savings");
    setLoading(false);
  }

  async function loadLoans() {
    setLoading(true);
    const [ln, mb] = await Promise.all([
      supabase.from("loans").select("*").gte("issue_date", dateFrom).lte("issue_date", dateTo).order("issue_date"),
      supabase.from("members").select("id, full_name, member_number"),
    ]);
    const members = mb.data || [];
    const todayStr = today();
    const rows = (ln.data || []).map(l => {
      const m = members.find(m => m.id === l.members_id);
      const isOverdue = l.loan_status === "approved" && l.due_date && l.due_date < todayStr;
      return [
        m?.member_number || "—",
        m?.full_name     || "—",
        `UGX ${fmt(l.loan_amount)}`,
        `${l.interest_rate}%`,
        `UGX ${fmt(l.total_amount_to_pay)}`,
        `UGX ${fmt(l.amount_paid || 0)}`,
        `UGX ${fmt(l.balance || 0)}`,
        l.loan_status,
        l.issue_date || "—",
        l.due_date   || "—",
        isOverdue ? "YES" : "No",
      ];
    });
    const data = ln.data || [];
    setLoansData({
      rows,
      summary: [
        { label: "Total Loans", value: rows.length },
        { label: "Total Issued", value: `UGX ${fmt(data.reduce((a,l)=>a+Number(l.loan_amount),0))}` },
        { label: "Total Collected", value: `UGX ${fmt(data.reduce((a,l)=>a+Number(l.amount_paid||0),0))}` },
        { label: "Outstanding", value: `UGX ${fmt(data.reduce((a,l)=>a+Number(l.balance||0),0))}` },
        { label: "Overdue", value: data.filter(l=>l.loan_status==="approved"&&l.due_date&&l.due_date<todayStr).length },
      ],
    });
    setActive("loans");
    setLoading(false);
  }

  async function loadFines() {
    setLoading(true);
    const [fn, mb] = await Promise.all([
      supabase.from("fines").select("*").gte("issued_date", dateFrom).lte("issued_date", dateTo).order("issued_date"),
      supabase.from("members").select("id, full_name, member_number"),
    ]);
    const members = mb.data || [];
    const rows = (fn.data || []).map(f => {
      const m = members.find(m => m.id === f.member_id);
      return [
        m?.member_number || "—",
        m?.full_name     || "—",
        f.fine_reason    || "—",
        `UGX ${fmt(f.amount)}`,
        f.fine_status    || "—",
        f.issued_date    || "—",
        f.payment_date   || "—",
        f.notes          || "—",
      ];
    });
    const data = fn.data || [];
    const paid   = data.filter(f=>f.fine_status==="paid").reduce((a,f)=>a+Number(f.amount),0);
    const unpaid = data.filter(f=>f.fine_status==="unpaid").reduce((a,f)=>a+Number(f.amount),0);
    setFinesData({
      rows,
      summary: [
        { label: "Total Fines", value: rows.length },
        { label: "Total Amount", value: `UGX ${fmt(data.reduce((a,f)=>a+Number(f.amount),0))}` },
        { label: "Collected", value: `UGX ${fmt(paid)}` },
        { label: "Outstanding", value: `UGX ${fmt(unpaid)}` },
        { label: "Collection Rate", value: `${data.reduce((a,f)=>a+Number(f.amount),0)>0?Math.round((paid/data.reduce((a,f)=>a+Number(f.amount),0))*100):0}%` },
      ],
    });
    setActive("fines");
    setLoading(false);
  }

  async function loadWelfare() {
    setLoading(true);
    const [wf, mb] = await Promise.all([
      supabase.from("welfare_contributions").select("*"),
      supabase.from("members").select("id, full_name, member_number"),
    ]);
    const members = mb.data || [];
    // Group by member
    const map = {};
    (wf.data || []).forEach(c => {
      if (!map[c.member_id]) map[c.member_id] = { total: 0, count: 0 };
      map[c.member_id].total += Number(c.amount || 0);
      map[c.member_id].count += 1;
    });
    const rows = members.map(m => [
      m.member_number,
      m.full_name,
      map[m.id]?.count  || 0,
      `UGX ${fmt(map[m.id]?.total || 0)}`,
      map[m.id] ? "✓ Yes" : "✗ No",
    ]).sort((a, b) => {
      const ta = Number(String(a[3]).replace(/[^0-9]/g,""));
      const tb = Number(String(b[3]).replace(/[^0-9]/g,""));
      return tb - ta;
    });
    const totalFund   = (wf.data||[]).reduce((a,c)=>a+Number(c.amount||0),0);
    const contributed = Object.keys(map).length;
    setWelfareData({
      rows,
      summary: [
        { label: "Total Fund", value: `UGX ${fmt(totalFund)}` },
        { label: "Contributing Members", value: contributed },
        { label: "Not Contributed", value: members.length - contributed },
        { label: "Participation", value: `${members.length>0?Math.round((contributed/members.length)*100):0}%` },
      ],
    });
    setActive("welfare");
    setLoading(false);
  }

  async function loadTreat() {
    setLoading(true);
    const [tr, mb] = await Promise.all([
      supabase.from("treat").select("*").gte("transaction_date", dateFrom).lte("transaction_date", dateTo).order("transaction_date"),
      supabase.from("members").select("id, full_name, member_number"),
    ]);
    const members = mb.data || [];
    const txs      = tr.data || [];

    // Row per transaction — subscription rows excluded from member-facing financial rows
    // but counted separately in the summary (committee fund), per the rule that the
    // subscription fee is not part of a member's treat balance.
    const rows = txs
      .filter(t => t.transaction_type !== "subscription")
      .map(t => {
        const m = members.find(m => m.id === t.member_id);
        return [
          m?.member_number || "—",
          m?.full_name     || "—",
          t.account_number || "—",
          t.transaction_type || "—",
          `UGX ${fmt(t.amount)}`,
          `UGX ${fmt(t.balance_after)}`,
          t.payment_method || "—",
          t.transaction_date || "—",
          t.notes || "—",
        ];
      });

    const deposits      = txs.filter(t=>t.transaction_type==="deposit").reduce((a,t)=>a+Number(t.amount),0);
    const withdrawals   = txs.filter(t=>t.transaction_type==="withdrawal").reduce((a,t)=>a+Number(t.amount),0);
    const subscriptions = txs.filter(t=>t.transaction_type==="subscription");
    const subRevenue    = subscriptions.reduce((a,t)=>a+Number(t.amount),0);
    const subscribedIds = new Set(subscriptions.map(t=>t.member_id));

    // Current fund balance — latest non-subscription balance per enrolled member
    const enrolledIds = new Set(txs.filter(t=>t.transaction_type!=="subscription").map(t=>t.member_id));
    let totalFund = 0;
    enrolledIds.forEach(mid => {
      const memberTx = txs
        .filter(t => t.member_id === mid && t.transaction_type !== "subscription")
        .sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date));
      if (memberTx.length > 0) totalFund += Number(memberTx[0].balance_after || 0);
    });

    setTreatData({
      rows,
      summary: [
        { label: "Total Treat Fund",        value: `UGX ${fmt(totalFund)}` },
        { label: "Subscribed Members",      value: subscribedIds.size },
        { label: "Subscription Revenue",    value: `UGX ${fmt(subRevenue)} (committee)` },
        { label: "Total Deposited",         value: `UGX ${fmt(deposits)}` },
        { label: "Total Withdrawn",         value: `UGX ${fmt(withdrawals)}` },
      ],
    });
    setActive("treat");
    setLoading(false);
  }

  async function loadMembers() {
    setLoading(true);
    const [mb, pk] = await Promise.all([
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      supabase.from("saving_packages").select("id, package_name"),
    ]);
    const packages = pk.data || [];
    const rows = (mb.data || []).map(m => {
      const p = packages.find(p => p.id === m.saving_package_id);
      return [
        m.member_number,
        m.full_name,
        m.gender,
        m.contact,
        m.email || "—",
        m.address,
        m.date_of_birth ? new Date(m.date_of_birth).toLocaleDateString() : "—",
        m.national_id_number || "—",
        m.next_of_kin_name,
        m.next_of_kin_contact,
        p?.package_name || "—",
        m.member_status,
        m.created_at ? new Date(m.created_at).toLocaleDateString() : "—",
      ];
    });
    const data = mb.data || [];
    setMembersData({
      rows,
      summary: [
        { label: "Total Members", value: rows.length },
        { label: "Active", value: data.filter(m=>m.member_status==="active").length },
        { label: "Inactive", value: data.filter(m=>m.member_status==="inactive").length },
        { label: "Suspended", value: data.filter(m=>m.member_status==="suspended").length },
        { label: "Male", value: data.filter(m=>m.gender==="Male").length },
        { label: "Female", value: data.filter(m=>m.gender==="Female").length },
      ],
    });
    setActive("members");
    setLoading(false);
  }

  async function loadMonthly() {
    setLoading(true);
    const [sv, ln, fn, wf, tr] = await Promise.all([
      supabase.from("savings").select("amount, transaction_type, saving_date").gte("saving_date", dateFrom).lte("saving_date", dateTo),
      supabase.from("loans").select("loan_amount, amount_paid, balance, loan_status, issue_date").gte("issue_date", dateFrom).lte("issue_date", dateTo),
      supabase.from("fines").select("amount, fine_status, issued_date").gte("issued_date", dateFrom).lte("issued_date", dateTo),
      supabase.from("welfare_contributions").select("amount"),
      supabase.from("treat").select("amount, transaction_type, transaction_date").gte("transaction_date", dateFrom).lte("transaction_date", dateTo),
    ]);

    const savings     = sv.data || [];
    const loans       = ln.data || [];
    const fines       = fn.data || [];
    const treat       = tr.data || [];

    const totalSavings    = savings.filter(s=>s.transaction_type!=="withdrawal").reduce((a,s)=>a+Number(s.amount),0);
    const totalWithdrawals= savings.filter(s=>s.transaction_type==="withdrawal").reduce((a,s)=>a+Number(s.amount),0);
    const totalLoans      = loans.reduce((a,l)=>a+Number(l.loan_amount),0);
    const loansCollected  = loans.reduce((a,l)=>a+Number(l.amount_paid||0),0);
    const totalFines      = fines.reduce((a,f)=>a+Number(f.amount),0);
    const finesCollected  = fines.filter(f=>f.fine_status==="paid").reduce((a,f)=>a+Number(f.amount),0);
    const totalWelfare    = (wf.data||[]).reduce((a,w)=>a+Number(w.amount||0),0);
    const treatDeposits   = treat.filter(t=>t.transaction_type==="deposit").reduce((a,t)=>a+Number(t.amount),0);
    const treatWithdrawn  = treat.filter(t=>t.transaction_type==="withdrawal").reduce((a,t)=>a+Number(t.amount),0);
    const treatSubRevenue = treat.filter(t=>t.transaction_type==="subscription").reduce((a,t)=>a+Number(t.amount),0);

    const rows = [
      ["💰 Savings Deposits",    savings.filter(s=>s.transaction_type!=="withdrawal").length, `UGX ${fmt(totalSavings)}`, ""],
      ["📤 Savings Withdrawals", savings.filter(s=>s.transaction_type==="withdrawal").length,  `UGX ${fmt(totalWithdrawals)}`, ""],
      ["📋 Loans Issued",        loans.length,  `UGX ${fmt(totalLoans)}`,     `UGX ${fmt(loansCollected)} collected`],
      ["⚠️ Fines Issued",        fines.length,  `UGX ${fmt(totalFines)}`,     `UGX ${fmt(finesCollected)} collected`],
      ["🤝 Welfare Fund",        (wf.data||[]).length, `UGX ${fmt(totalWelfare)}`, "Total all-time fund"],
      ["🏦 Treat Deposits",      treat.filter(t=>t.transaction_type==="deposit").length, `UGX ${fmt(treatDeposits)}`, ""],
      ["🏦 Treat Withdrawals",   treat.filter(t=>t.transaction_type==="withdrawal").length, `UGX ${fmt(treatWithdrawn)}`, ""],
      ["🔑 Treat Subscriptions", treat.filter(t=>t.transaction_type==="subscription").length, `UGX ${fmt(treatSubRevenue)}`, "Committee fund"],
    ];

    setMonthlyData({
      rows,
      summary: [
        { label: "Period", value: `${dateFrom} to ${dateTo}` },
        { label: "Net Savings", value: `UGX ${fmt(totalSavings - totalWithdrawals)}` },
        { label: "Loans Outstanding", value: `UGX ${fmt(loans.reduce((a,l)=>a+Number(l.balance||0),0))}` },
        { label: "Fines Pending", value: `UGX ${fmt(fines.filter(f=>f.fine_status==="unpaid").reduce((a,f)=>a+Number(f.amount),0))}` },
        { label: "Treat Net (Dep − With)", value: `UGX ${fmt(treatDeposits - treatWithdrawn)}` },
      ],
    });
    setActive("monthly");
    setLoading(false);
  }

  // ── Report configs
  const reports = [
    {
      key: "savings",
      icon: "💰", title: "Savings Report", color: "#15803d",
      description: "All deposits, withdrawals and transactions by date range",
      headers: ["Mem No.","Member","Amount","Type","Method","Reference","Date","Package","Notes"],
      data: savingsData,
      onGenerate: loadSavings,
      filename: "peacevyn_savings_report.csv",
    },
    {
      key: "loans",
      icon: "📋", title: "Loans Report", color: "#2563eb",
      description: "Loan issuance, repayments, balances and overdue status",
      headers: ["Mem No.","Member","Loan Amt","Interest","Total","Paid","Balance","Status","Issue Date","Due Date","Overdue"],
      data: loansData,
      onGenerate: loadLoans,
      filename: "peacevyn_loans_report.csv",
    },
    {
      key: "fines",
      icon: "⚠️", title: "Fines Report", color: "#dc2626",
      description: "All fines issued, status and collection by date range",
      headers: ["Mem No.","Member","Reason","Amount","Status","Issued","Due","Notes"],
      data: finesData,
      onGenerate: loadFines,
      filename: "peacevyn_fines_report.csv",
    },
    {
      key: "welfare",
      icon: "🤝", title: "Welfare Report", color: "#7e22ce",
      description: "Welfare contributions per member — all time",
      headers: ["Mem No.","Member","# Records","Total Contributed","Contributed?"],
      data: welfareData,
      onGenerate: loadWelfare,
      filename: "peacevyn_welfare_report.csv",
    },
    {
      key: "treat",
      icon: "🏦", title: "Emergency Treat Report", color: "#15803d",
      description: "Treat deposits, withdrawals and committee subscription revenue by date range",
      headers: ["Mem No.","Member","Account","Type","Amount","Balance After","Method","Date","Notes"],
      data: treatData,
      onGenerate: loadTreat,
      filename: "peacevyn_treat_report.csv",
    },
    {
      key: "members",
      icon: "👥", title: "Members Report", color: "#800020",
      description: "Full member list with all details and status",
      headers: ["Mem No.","Name","Gender","Contact","Email","Address","DOB","National ID","Next of Kin","NOK Contact","Package","Status","Joined"],
      data: membersData,
      onGenerate: loadMembers,
      filename: "peacevyn_members_report.csv",
    },
    {
      key: "monthly",
      icon: "📅", title: "Monthly Summary", color: "#ca8a04",
      description: "Overview of all activity — savings, loans, fines and welfare",
      headers: ["Category","# Records","Total Amount","Notes"],
      data: monthlyData,
      onGenerate: loadMonthly,
      filename: "peacevyn_monthly_summary.csv",
    },
  ];

  const activeReport = reports.find(r => r.key === active);

  return (
    <div style={{ background: "#f8f7f5", minHeight: "100vh", padding: "20px 16px", fontFamily: "sans-serif" }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg);} }
        input:focus { border-color:#800020 !important; box-shadow:0 0 0 3px rgba(128,0,32,0.08); outline:none; }
      `}</style>

      {/* ── Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#800020", fontFamily: "Georgia, serif" }}>
          Reports
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
          Generate, download or print reports for any period
        </p>
      </div>

      {/* ── Date filter (for date-range reports) */}
      <FilterBar
        dateFrom={dateFrom} dateTo={dateTo}
        setDateFrom={setDateFrom} setDateTo={setDateTo}
        onApply={() => active && reports.find(r=>r.key===active)?.onGenerate()}
        loading={loading}
      />

      {/* ── Report cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14, marginBottom: 24 }}>
        {reports.map(r => (
          <div key={r.key} style={{ cursor: "pointer" }} onClick={() => r.onGenerate()}>
            <div style={{
              background: "#fff", borderRadius: 14,
              boxShadow: active === r.key ? `0 0 0 3px ${r.color}` : "0 2px 12px rgba(0,0,0,0.07)",
              border: active === r.key ? `2px solid ${r.color}` : "1px solid #f3e8ea",
              overflow: "hidden", transition: "box-shadow 0.2s",
            }}>
              <div style={{ background: `linear-gradient(135deg,${r.color},${r.color}bb)`, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 26 }}>{r.icon}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "Georgia, serif" }}>{r.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 1 }}>{r.description}</div>
                </div>
              </div>
              <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {active === r.key && r.data ? `${r.data.rows.length} records` : "Click to generate"}
                </span>
                {loading && active === r.key
                  ? <div style={{ width:18,height:18,border:"2px solid #f0e8ea",borderTop:`2px solid ${r.color}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
                  : <span style={{ color: r.color, fontSize: 18, fontWeight: 700 }}>→</span>
                }
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active report output */}
      {activeReport && activeReport.data && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#800020", fontFamily: "Georgia, serif" }}>
              {activeReport.icon} {activeReport.title}
            </h2>
            <span style={{ fontSize: 12, color: "#888" }}>
              {activeReport.key !== "welfare" && activeReport.key !== "members"
                ? `${dateFrom} — ${dateTo}`
                : "All time"}
            </span>
          </div>

          <ReportTable
            title={activeReport.title}
            headers={activeReport.headers}
            rows={activeReport.data.rows}
            summary={activeReport.data.summary}
            onCSV={() => downloadCSV(
              activeReport.filename,
              activeReport.headers,
              activeReport.data.rows,
            )}
            onPrint={() => printTable(
              activeReport.title,
              activeReport.headers,
              activeReport.data.rows,
              activeReport.data.summary,
            )}
          />
        </div>
      )}

      {/* Empty state */}
      {!active && (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 16, color: "#555", fontWeight: 600, margin: "0 0 6px" }}>Select a report above to get started</p>
          <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>Choose a date range then click any report card</p>
        </div>
      )}
    </div>
  );
}
