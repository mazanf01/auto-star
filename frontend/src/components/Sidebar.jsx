import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Fingerprint, Clock, History, Wallet,
  UserCircle, User, LogOut, X, Shield, Settings, Users, Activity, MapPin,
  Calendar, BarChart3, Send, Cog, KeyRound
} from 'lucide-react';

const iconMap = {
  LayoutDashboard, Fingerprint, Clock, History, Wallet, UserCircle, User,
  Shield, Settings, Users, Activity, MapPin, Calendar, BarChart3, Send, Cog, KeyRound,
};

export function Sidebar({ open, setOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);

  useEffect(() => {
    api.getMyMenus().then(r => setMenus(r.menus || [])).catch(() => { });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Admin-only menus
  const adminMenus = user?.role === 'admin' ? [
    { name: 'Manajemen User', slug: 'admin-users', icon: 'Users', path: '/admin/users' },
    { name: 'Akun STAR ASN', slug: 'admin-star-accounts', icon: 'KeyRound', path: '/admin/star-accounts' },
    { name: 'Manajemen Menu', slug: 'admin-menus', icon: 'Settings', path: '/admin/menus' },
    { name: 'Kalender Libur', slug: 'admin-holidays', icon: 'Calendar', path: '/admin/holidays' },
    { name: 'Telegram Bot', slug: 'admin-telegram', icon: 'Send', path: '/admin/telegram' },
    { name: 'System Config', slug: 'admin-settings', icon: 'Cog', path: '/admin/settings' },
    { name: 'Aktivitas User', slug: 'admin-activity', icon: 'Activity', path: '/admin/activity' },
    { name: 'Auto Presensi All', slug: 'admin-auto-presensi', icon: 'Shield', path: '/admin/auto-presensi' },
  ] : [];

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-700">
          <Shield className="w-8 h-8 text-blue-500" />
          <div>
            <div className="font-bold text-sm">STAR ASN</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Web Portal</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {menus.map(m => {
            const Icon = iconMap[m.icon] || LayoutDashboard;
            return (
              <NavLink
                key={m.id}
                to={m.path || `/${m.slug}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{m.name}</span>
              </NavLink>
            );
          })}

          {/* Admin section */}
          {adminMenus.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Admin</div>
              {adminMenus.map(m => {
                const Icon = iconMap[m.icon] || Settings;
                return (
                  <NavLink
                    key={m.slug}
                    to={m.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{m.name}</span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name || user?.email}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500 capitalize">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
