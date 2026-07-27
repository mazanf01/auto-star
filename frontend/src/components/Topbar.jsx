import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, Sun, Moon } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 sticky top-0 z-20">
      <button className="lg:hidden" onClick={onMenuClick}>
        <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
      </button>
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">STAR ASN Portal</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ganti ke light mode' : 'Ganti ke dark mode'}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-amber-300"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name || user?.email}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</div>
        </div>
      </div>
    </header>
  );
}
