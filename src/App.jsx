import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Savings from "./pages/Savings";
import Loans from "./pages/Loans";
import Fines from "./pages/Fines";
import SavingPackages from "./pages/SavingPackages";
import Welfare from "./pages/Welfare";
import Reports from "./pages/Reports";
import Treat from "./pages/Treat";


// Protects all routes — redirects to /login if not authenticated
function PrivateLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <p style={{ color: "#800020", fontFamily: "Georgia, serif", marginTop: 12 }}>
          Loading PeaceVyn…
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 20 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/fines" element={<Fines />} />
          <Route path="/packages" element={<SavingPackages />} />
          <Route path="/welfare" element={<Welfare />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/treat" element={<Treat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// Public route — redirect to home if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route path="/*" element={<PrivateLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff",
};

const spinnerStyle = {
  width: 36,
  height: 36,
  border: "3px solid #f0e8ea",
  borderTop: "3px solid #800020",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
