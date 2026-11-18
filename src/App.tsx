/**
 * App — root component.
 *
 * Sets up:
 *  - BrowserRouter (URL-based navigation)
 *  - AuthProvider  (global auth context)
 *  - Route tree    (public /login + protected shell)
 *  - Toast state   (UI-only, not auth-related)
 */
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }     from "./contexts/AuthContext";
import { ProtectedRoute }   from "./components/routing/ProtectedRoute";
import { AppLayoutRoute }   from "./layouts/AppLayoutRoute";
import { LoginPage }        from "./pages/LoginPage";
import { DashboardPage }    from "./pages/DashboardPage";
import { TransaksiPage }    from "./pages/TransaksiPage";
import { KwitansiPage }     from "./pages/KwitansiPage";
import { NotaPage }         from "./pages/NotaPage";
import UndanganPage         from "./pages/UndanganPage";
import DaftarHadirPage      from "./pages/DaftarHadirPage";
import { TrashPage }        from "./pages/TrashPage";

export default function App() {
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Protected shell (redirects to /login when unauthenticated) ── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayoutRoute toast={toast} />}>
              <Route path="/dashboard"    element={<DashboardPage />} />
              <Route path="/transaksi"    element={<TransaksiPage onToast={showToast} />} />
              <Route path="/kwitansi"     element={<KwitansiPage />} />
              <Route path="/nota"         element={<NotaPage onToast={showToast} />} />
              <Route path="/undangan"     element={<UndanganPage />} />
              <Route path="/daftar-hadir" element={<DaftarHadirPage onToast={showToast} />} />
              <Route path="/trash"        element={<TrashPage onToast={showToast} />} />
            </Route>
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
