import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-UG", { style: "decimal" }).format(Math.round(n));

const today = () => new Date().toISOString().split("T")[0];

function getMonthLabels(count = 6) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const labels = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(months[d.getMonth()]);
  }
  return labels;
}

// ─── Mini Bar Chart (pure CSS/SVG, no library) ────────────────────────────────
function BarChart({ data, color = "#800020", height = 100 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div
            style={{
              width: "100%",
              height: `${(v / max) * (height - 18)}px`,
              background: color,
              borderRadius: "3px 3px 0 0",
              opacity: i === data.length - 1 ? 1 : 0.55,
              transition: "height 0.6s ease",
              minHeight: v > 0 ? 4 : 0,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Mini Line Chart (SVG) ────────────────────────────────────────────────────
function LineChart({ data, color = "#800020", height = 80 }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 260;
  const h = height;
  const pad = 8;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(" ")} L ${w - pad},${h} L ${pad},${h} Z`;
  const line = `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(" ")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace("#","")})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return (
          <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 4 : 2.5}
            fill={i === data.length - 1 ? color : "#fff"} stroke={color} strokeWidth="1.5" />
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ slices, size = 100 }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size * 0.38, stroke = size * 0.14;
  let cumulative = 0;
  const arcs = slices.map((s) => {
    const pct = s.value / total;
    const start = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const end = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = pct > 0.5 ? 1 : 0;
    return { ...s, d: pct < 0.001 ? "" : `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}` };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a, i) => a.d && (
        <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={stroke}
          strokeLinecap="butt" />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="white" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ title, value, sub, icon, color, trend, trendUp }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      borderLeft: `4px solid ${color}`,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </span>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#111", fontFamily: "Georgia, serif" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#999" }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 12, color: trendUp ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
          {trendUp ? "▲" : "▼"} {trend}
        </div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>{title}</h3>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{sub}</p>}
    </div>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    active: ["#dcfce7", "#16a34a"],
    inactive: ["#f3f4f6", "#6b7280"],
    approved: ["#dcfce7", "#16a34a"],
    pending: ["#fef9c3", "#ca8a04"],
    rejected: ["#fee2e2", "#dc2626"],
    paid: ["#dcfce7", "#16a34a"],
    unpaid: ["#fee2e2", "#dc2626"],
  };
  const [bg, fg] = map[status?.toLowerCase()] || ["#f3f4f6", "#6b7280"];
  return (
    <span style={{
      background: bg, color: fg, fontSize: 11, fontWeight: 700,
      padding: "2px 8px", borderRadius: 99, textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({
    totalMembers: 0, activeMembers: 0, inactiveMembers: 0,
    totalSavings: 0, avgSavingsPerMember: 0,
    totalWelfare: 0,
    totalLoans: 0, outstandingLoans: 0, pendingLoans: 0, approvedLoans: 0,
    loanRepaymentRate: 0,
    totalFines: 0, unpaidFines: 0, paidFines: 0,
    collectionRate: 0,
  });
  const [savingsTrend, setSavingsTrend] = useState([0,0,0,0,0,0]);
  const [loansTrend, setLoansTrend] = useState([0,0,0,0,0,0]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topSavers, setTopSavers] = useState([]);
  const [loanPortfolio, setLoanPortfolio] = useState([]);
  const [refreshed, setRefreshed] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadKPIs(), loadTrends(), loadRecentActivity(), loadTopSavers(), loadLoanPortfolio()]);
    setRefreshed(new Date().toLocaleTimeString());
    setLoading(false);
  }

  async function loadKPIs() {
    const [membersRes, savingsRes, loansRes, finesRes, welfareRes] = await Promise.all([
      supabase.from("members").select("member_status"),
      supabase.from("savings").select("amount, transaction_type, created_at"),
      supabase.from("loans").select("loan_amount, amount_paid, balance, loan_status, total_amount_to_pay"),
      supabase.from("fines").select("amount, fine_status"),
      supabase.from("welfare_contributions").select("amount"),
    ]);

    const members = membersRes.data || [];
    const savings = savingsRes.data || [];
    const loans = loansRes.data || [];
    const fines = finesRes.data || [];
    const welfare = welfareRes.data || [];

    const activeMembers = members.filter(m => m.member_status === "active").length;
    const totalSavings = savings.filter(s => s.transaction_type !== "withdrawal").reduce((s, r) => s + Number(r.amount), 0);
    const totalWelfare = welfare.reduce((s, r) => s + Number(r.amount || 0), 0);

    const totalLoans = loans.reduce((s, r) => s + Number(r.loan_amount), 0);
    const outstanding = loans.filter(l => l.loan_status === "approved")
      .reduce((s, r) => s + Number(r.balance || 0), 0);
    const amountPaid = loans.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
    const repayRate = totalLoans > 0 ? Math.round((amountPaid / totalLoans) * 100) : 0;

    const totalFines = fines.reduce((s, r) => s + Number(r.amount), 0);
    const unpaidFines = fines.filter(f => f.fine_status === "unpaid").reduce((s, r) => s + Number(r.amount), 0);
    const paidFines = fines.filter(f => f.fine_status === "paid").reduce((s, r) => s + Number(r.amount), 0);
    const collectionRate = totalFines > 0 ? Math.round((paidFines / totalFines) * 100) : 0;

    setKpi({
      totalMembers: members.length,
      activeMembers,
      inactiveMembers: members.length - activeMembers,
      totalSavings,
      avgSavingsPerMember: activeMembers > 0 ? Math.round(totalSavings / activeMembers) : 0,
      totalWelfare,
      totalLoans,
      outstandingLoans: outstanding,
      pendingLoans: loans.filter(l => l.loan_status === "pending").length,
      approvedLoans: loans.filter(l => l.loan_status === "approved").length,
      loanRepaymentRate: repayRate,
      totalFines,
      unpaidFines,
      paidFines,
      collectionRate,
    });
  }

  async function loadTrends() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
      const end = new Date(d.getFullYear(), d.getMonth()+1, 0);
      const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,"0")}-${String(end.getDate()).padStart(2,"0")}`;
      months.push({ start, end: endStr });
    }

    const savTrend = [];
    const loanTrend = [];
    for (const { start, end } of months) {
      const [sv, ln] = await Promise.all([
        supabase.from("savings").select("amount").gte("saving_date", start).lte("saving_date", end),
        supabase.from("loans").select("loan_amount").gte("issue_date", start).lte("issue_date", end),
      ]);
      savTrend.push((sv.data || []).reduce((s, r) => s + Number(r.amount), 0));
      loanTrend.push((ln.data || []).reduce((s, r) => s + Number(r.loan_amount), 0));
    }
    setSavingsTrend(savTrend);
    setLoansTrend(loanTrend);
  }

  async function loadRecentActivity() {
    const todayStr = today();
    const [sv, ln, fi] = await Promise.all([
      supabase.from("savings").select("amount, created_at, member_id").gte("saving_date", todayStr).order("created_at", { ascending: false }).limit(5),
      supabase.from("loans").select("loan_amount, loan_status, created_at, members_id").gte("issue_date", todayStr).order("created_at", { ascending: false }).limit(5),
      supabase.from("fines").select("amount, fine_reason, created_at, member_id").gte("issued_date", todayStr).order("created_at", { ascending: false }).limit(5),
    ]);

    const activities = [
      ...(sv.data || []).map(r => ({ type: "savings", amount: r.amount, time: r.created_at, icon: "💰", color: "#16a34a", label: "Savings deposit" })),
      ...(ln.data || []).map(r => ({ type: "loan", amount: r.loan_amount, time: r.created_at, icon: "📋", color: "#2563eb", label: `Loan — ${r.loan_status}` })),
      ...(fi.data || []).map(r => ({ type: "fine", amount: r.amount, time: r.created_at, icon: "⚠️", color: "#dc2626", label: `Fine: ${r.fine_reason || "issued"}` })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    setRecentActivity(activities);
  }

  async function loadTopSavers() {
    const { data } = await supabase.from("savings").select("member_id, amount");
    if (!data) return;
    const map = {};
    data.forEach(r => { map[r.member_id] = (map[r.member_id] || 0) + Number(r.amount); });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const ids = sorted.map(s => Number(s[0])).filter(Boolean);
    let names = {};
    if (ids.length) {
      const { data: mdata } = await supabase.from("members").select("id, full_name").in("id", ids);
      (mdata || []).forEach(m => { names[m.id] = m.full_name; });
    }
    setTopSavers(sorted.map(([id, total]) => ({ name: names[Number(id)] || `Member #${id}`, total })));
  }

  async function loadLoanPortfolio() {
    const { data } = await supabase.from("loans").select("loan_amount, balance, loan_status, members_id, due_date").order("created_at", { ascending: false }).limit(6);
    if (!data) return;
    const ids = [...new Set((data).map(l => l.members_id).filter(Boolean))];
    let names = {};
    if (ids.length) {
      const { data: mdata } = await supabase.from("members").select("id, full_name").in("id", ids);
      (mdata || []).forEach(m => { names[m.id] = m.full_name; });
    }
    setLoanPortfolio(data.map(l => ({ ...l, memberName: names[l.members_id] || "Unknown" })));
  }

  const monthLabels = getMonthLabels(6);

  // ── Loan status donut data
  const loanDonut = [
    { label: "Approved", value: kpi.approvedLoans, color: "#16a34a" },
    { label: "Pending", value: kpi.pendingLoans, color: "#ca8a04" },
    { label: "Other", value: Math.max(0, kpi.totalMembers - kpi.approvedLoans - kpi.pendingLoans), color: "#e5e7eb" },
  ];

  // ── Member status donut
  const memberDonut = [
    { label: "Active", value: kpi.activeMembers, color: "#800020" },
    { label: "Inactive", value: kpi.inactiveMembers, color: "#e5e7eb" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #f0e8ea", borderTop: "3px solid #800020", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#800020", fontFamily: "Georgia, serif", margin: 0 }}>Loading dashboard…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: "#f8f7f5", minHeight: "100vh", padding: "20px 16px", fontFamily: "sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#800020", fontFamily: "Georgia, serif" }}>
            PeaceVyn Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            {new Date().toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {refreshed && ` · Updated ${refreshed}`}
          </p>
        </div>
        <button
          onClick={loadAll}
          style={{ background: "#800020", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── KPI Row 1: Members & Savings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
        <KPICard title="Total Members" value={kpi.totalMembers} icon="👥"
          color="#800020" sub={`${kpi.activeMembers} active · ${kpi.inactiveMembers} inactive`} />
        <KPICard title="Total Savings" value={`UGX ${fmt(kpi.totalSavings)}`} icon="💰"
          color="#16a34a" sub={`Avg UGX ${fmt(kpi.avgSavingsPerMember)} / member`} />
        <KPICard title="Welfare Fund" value={`UGX ${fmt(kpi.totalWelfare)}`} icon="🤝"
          color="#7c3aed" sub="Total welfare contributions" />
        <KPICard title="Outstanding Loans" value={`UGX ${fmt(kpi.outstandingLoans)}`} icon="📋"
          color="#2563eb" sub={`${kpi.approvedLoans} active · ${kpi.pendingLoans} pending`} />
      </div>

      {/* ── KPI Row 2: Fines & Rates */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KPICard title="Total Fines Issued" value={`UGX ${fmt(kpi.totalFines)}`} icon="⚠️"
          color="#dc2626" sub={`UGX ${fmt(kpi.unpaidFines)} still unpaid`} />
        <KPICard title="Fine Collection Rate" value={`${kpi.collectionRate}%`} icon="📊"
          color="#ca8a04" sub={`UGX ${fmt(kpi.paidFines)} collected`}
          trend={`${kpi.collectionRate}% collected`} trendUp={kpi.collectionRate >= 70} />
        <KPICard title="Loan Repayment Rate" value={`${kpi.loanRepaymentRate}%`} icon="✅"
          color="#0891b2" sub={`UGX ${fmt(kpi.totalLoans)} total issued`}
          trend={`${kpi.loanRepaymentRate}% repaid`} trendUp={kpi.loanRepaymentRate >= 60} />
        <KPICard title="Loan Portfolio" value={`UGX ${fmt(kpi.totalLoans)}`} icon="🏦"
          color="#800020" sub="Total loans ever issued" />
      </div>

      {/* ── Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Savings Trend */}
        <Panel>
          <SectionTitle title="Savings Trend" sub="Monthly deposits over last 6 months" />
          <LineChart data={savingsTrend} color="#800020" height={90} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {monthLabels.map((m, i) => (
              <span key={i} style={{ fontSize: 10, color: "#aaa", flex: 1, textAlign: "center" }}>{m}</span>
            ))}
          </div>
        </Panel>

        {/* Loans Trend */}
        <Panel>
          <SectionTitle title="Loans Issued" sub="Monthly loan issuance over last 6 months" />
          <LineChart data={loansTrend} color="#2563eb" height={90} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {monthLabels.map((m, i) => (
              <span key={i} style={{ fontSize: 10, color: "#aaa", flex: 1, textAlign: "center" }}>{m}</span>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Donuts & Bars Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Member Status Donut */}
        <Panel style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <SectionTitle title="Member Status" />
          <DonutChart slices={memberDonut} size={100} />
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {memberDonut.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                <span style={{ color: "#555" }}>{s.label}: <strong>{s.value}</strong></span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Loan Status Donut */}
        <Panel style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <SectionTitle title="Loan Status" />
          <DonutChart slices={loanDonut} size={100} />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {loanDonut.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                <span style={{ color: "#555" }}>{s.label}: <strong>{s.value}</strong></span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Fine Collection Bar */}
        <Panel>
          <SectionTitle title="Fine Collection" sub="Paid vs unpaid (UGX)" />
          <BarChart
            data={[kpi.paidFines, kpi.unpaidFines]}
            color="#800020"
            height={90}
          />
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>✓ Paid: {fmt(kpi.paidFines)}</span>
            <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>✗ Unpaid: {fmt(kpi.unpaidFines)}</span>
          </div>
        </Panel>
      </div>

      {/* ── Bottom Row: Activity + Top Savers + Loan Portfolio */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

        {/* Today's Activity */}
        <Panel>
          <SectionTitle title="Today's Activity" sub={`Transactions on ${today()}`} />
          {recentActivity.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 20 }}>No activity recorded today</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: `${a.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      UGX {fmt(a.amount)} · {new Date(a.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: a.color, flexShrink: 0 }}>
                    +{fmt(a.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Top Savers */}
        <Panel>
          <SectionTitle title="Top Savers" sub="Members by total savings" />
          {topSavers.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 20 }}>No savings data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topSavers.map((s, i) => {
                const maxVal = topSavers[0].total || 1;
                const pct = Math.round((s.total / maxVal) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: "#111" }}>
                        {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i+1}. `}{s.name}
                      </span>
                      <span style={{ color: "#800020", fontWeight: 700 }}>UGX {fmt(s.total)}</span>
                    </div>
                    <div style={{ background: "#f0f0f0", borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${pct}%`, background: "#800020", height: 6, borderRadius: 4, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Loan Portfolio */}
        <Panel>
          <SectionTitle title="Loan Portfolio" sub="Recent active loans" />
          {loanPortfolio.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 20 }}>No loans found</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {loanPortfolio.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < loanPortfolio.length - 1 ? "1px solid #f3f3f3" : "none" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110 }}>
                      {l.memberName}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      Due: {l.due_date ? new Date(l.due_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>UGX {fmt(l.loan_amount)}</div>
                    <Badge status={l.loan_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

      </div>
    </div>
  );
}
