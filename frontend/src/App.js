import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Hub from "@/pages/Hub";
import Education from "@/pages/Education";
import Job from "@/pages/Job";
import Investment from "@/pages/Investment";
import World from "@/pages/World";
import Quick from "@/pages/Quick";
import Config from "@/pages/Config";
import Bookmarks from "@/pages/Bookmarks";
import "@/App.css";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-muted">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function LoginGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-muted">Loading…</div>;
  if (user) return <Navigate to="/app" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginGate />} />
          <Route path="/app" element={<Protected><Hub /></Protected>} />
          <Route path="/app/education" element={<Protected><Education /></Protected>} />
          <Route path="/app/job" element={<Protected><Job /></Protected>} />
          <Route path="/app/investment" element={<Protected><Investment /></Protected>} />
          <Route path="/app/world" element={<Protected><World /></Protected>} />
          <Route path="/app/quick" element={<Protected><Quick /></Protected>} />
          <Route path="/app/bookmarks" element={<Protected><Bookmarks /></Protected>} />
          <Route path="/app/config" element={<Protected><Config /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
