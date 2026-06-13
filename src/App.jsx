import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login          from "./pages/Login";
import MemberPortal   from "./pages/MemberPortal";
import Sidebar        from "./components/Sidebar";
import Dashboard      from "./pages/Dashboard";
import Members        from "./pages/Members";
import Savings        from "./pages/Savings";
import Loans          from "./pages/Loans";
import Fines          from "./pages/Fines";
import SavingPackages from "./pages/SavingPackages";
import Welfare        from "./pages/Welfare";
import Treat          from "./pages/Treat";
import UserManagement from "./pages/UserManagement";
import Reports        from "./pages/Reports";
import Requests       from "./pages/Requests";

// ── Admin / Staff layout with sidebar
function AdminLayout() {
  const { user, role, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user)   return <Navigate to="/login" replace />;
  if (role === "member") return <Navigate to="/portal" replace />;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 20, minHeight: "100vh", background: "#f8f7f5" }}>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/members"  element={<Members />} />
          <Route path="/savings"  element={<Savings />} />
          <Route path="/loans"    element={<Loans />} />
          <Route path="/fines"    element={<Fines />} />
          <Route path="/packages" element={<SavingPackages />} />
          <Route path="/welfare"  element={<Welfare />} />
          <Route path="/treat"    element={<Treat />} />
          <Route path="/reports"  element={<Reports />} />
          <Route path="/requests" element={role === "admin" ?  <Requests /> : <Navigate to="/" replace />} />
          <Route path="/users"    element={role === "admin" ? <UserManagement /> : <Navigate to="/" replace />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ── Member portal (clean mobile layout)
function MemberRoute() {
  const { user, role, loading } = useAuth();
  if (loading)          return <Loader />;
  if (!user)            return <Navigate to="/login" replace />;
  if (role !== "member") return <Navigate to="/" replace />;
  return <MemberPortal />;
}

// ── Public route — redirect if already logged in
function PublicRoute({ children }) {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user) return role === "member"
    ? <Navigate to="/portal" replace />
    : <Navigate to="/" replace />;
  return children;
}

function Loader() {
  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff" }}>
      <div style={{ width:36,height:36,border:"3px solid #f0e8ea",borderTop:"3px solid #800020",borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:"#800020",fontFamily:"Georgia, serif",marginTop:12 }}>Loading PeaceVyn…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/portal" element={<MemberRoute />} />
          <Route path="/*"      element={<AdminLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
 
