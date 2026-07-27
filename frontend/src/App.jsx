import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Presensi } from './pages/Presensi';
import { AutoPresensi } from './pages/AutoPresensi';
import { PresensiLogs } from './pages/PresensiLogs';
import { Tunkin } from './pages/Tunkin';
import { Identity } from './pages/Identity';
import { Profile } from './pages/Profile';
import { SavedLocations } from './pages/SavedLocations';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminMenus } from './pages/admin/AdminMenus';
import { AdminActivity } from './pages/admin/AdminActivity';
import { AdminAutoPresensi } from './pages/admin/AdminAutoPresensi';
import { AdminHolidays } from './pages/admin/AdminHolidays';
import { AdminTelegram } from './pages/admin/AdminTelegram';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminStarAccounts } from './pages/admin/AdminStarAccounts';
import { Analytics } from './pages/Analytics';

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/presensi" element={<Presensi />} />
        <Route path="/auto-presensi" element={<AutoPresensi />} />
        <Route path="/presensi-logs" element={<PresensiLogs />} />
        <Route path="/tunjangan" element={<Tunkin />} />
        <Route path="/identitas" element={<Identity />} />
        <Route path="/saved-locations" element={<SavedLocations />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* Admin routes */}
        <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/menus" element={<ProtectedRoute requireAdmin><AdminMenus /></ProtectedRoute>} />
        <Route path="/admin/activity" element={<ProtectedRoute requireAdmin><AdminActivity /></ProtectedRoute>} />
        <Route path="/admin/auto-presensi" element={<ProtectedRoute requireAdmin><AdminAutoPresensi /></ProtectedRoute>} />
        <Route path="/admin/holidays" element={<ProtectedRoute requireAdmin><AdminHolidays /></ProtectedRoute>} />
        <Route path="/admin/telegram" element={<ProtectedRoute requireAdmin><AdminTelegram /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin/star-accounts" element={<ProtectedRoute requireAdmin><AdminStarAccounts /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
