import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, FileText, Users, BarChart3, Archive, Database,
  Bell, User, Shield, Briefcase, UserCheck, LogOut
} from 'lucide-react';

const roleLabels: Record<string, string> = {
  owner: 'Владелец', admin: 'Админ', curator: 'Куратор', hr: 'HR Менеджер', scout: 'Скаут'
};

function formatRoles(roles: string[]): string {
  return roles.map(r => roleLabels[r] || r).join(', ');
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = [
    { to: '/', icon: Home, label: 'Главная', roles: ['owner', 'admin', 'curator', 'hr', 'scout'] },
    { to: '/applications', icon: FileText, label: 'Анкеты', roles: ['owner', 'admin', 'curator', 'hr', 'scout'] },
    { to: '/teams', icon: Users, label: 'Команды', roles: ['owner', 'admin', 'curator', 'hr', 'scout'] },
    { to: '/statistics', icon: BarChart3, label: 'Статистика', roles: ['owner', 'admin', 'curator', 'hr', 'scout'] },
    { to: '/leads', icon: Database, label: 'БД Лидов', roles: ['owner', 'admin', 'scout'] },
    { to: '/archive', icon: Archive, label: 'Архив', roles: ['owner', 'admin', 'curator', 'hr'] },
    { to: '/notifications', icon: Bell, label: 'Уведомления', roles: ['owner', 'admin', 'curator', 'hr', 'scout'] },
    { to: '/hr-panel', icon: Briefcase, label: 'HR Панель', roles: ['owner', 'hr'] },
    { to: '/curator-panel', icon: UserCheck, label: 'Панель Куратора', roles: ['owner', 'curator'] },
    { to: '/admin-panel', icon: Shield, label: 'Панель Управления', roles: ['owner'] },
    { to: '/profile', icon: User, label: 'Профиль', roles: ['owner', 'admin', 'curator', 'hr', 'scout'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.some(r => user.roles.includes(r)));

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-dark-700">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg shadow-primary-600/30">
            LK
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">LIAMKING</h1>
            <p className="text-xs text-dark-400">AGENCY</p>
          </div>
        </motion.div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
            {user.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <p className="text-xs text-primary-400">{formatRoles(user.roles)}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.3 }}
          >
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 font-medium shadow-sm shadow-primary-600/10'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-white hover:translate-x-0.5'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-dark-700">
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-400 hover:bg-dark-800 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
