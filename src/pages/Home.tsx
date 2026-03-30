import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, hasRole } from '../contexts/AuthContext';
import { api } from '../api/client';
import { FileText, Users, TrendingUp, Bell, Eye, MessageSquare, Pin } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const roleLabels: Record<string, string> = {
  owner: 'Владелец', team_leader: 'Сквад Лидер', admin: 'Админ', curator: 'Куратор', hr: 'HR Менеджер', hr_huntme: 'HR HuntMe', hr_mason: 'HR Mason', scout: 'Скаут'
};

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get<any>('/stats/general').then(setStats).catch(() => {});
    api.get<any[]>('/posts').then(setPosts).catch(() => {});
    api.get<{ count: number }>('/notifications/unread-count').then(d => setUnreadCount(d.count)).catch(() => {});
  }, []);

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      {/* Welcome */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Добро пожаловать, {user?.full_name}!
          </h1>
          <p className="text-dark-400 mt-1">{user?.roles.map(r => roleLabels[r] || r).join(', ')} • LIAMKING AGENCY</p>
        </div>
        {unreadCount > 0 && (
          <Link to="/notifications" className="flex items-center gap-2 bg-primary-600/20 text-primary-400 px-4 py-2 rounded-lg hover:bg-primary-600/30 transition">
            <Bell size={18} />
            <span className="font-medium">{unreadCount} новых</span>
          </Link>
        )}
      </motion.div>

      {/* Stats cards */}
      {stats && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Всего анкет" value={stats.totalApplications} color="primary" />
          <StatCard icon={TrendingUp} label="Зарегистрировано" value={stats.registered} color="emerald" />
          <StatCard icon={Users} label="Пользователей" value={stats.totalUsers} color="violet" />
          <StatCard icon={TrendingUp} label="Конверсия" value={`${stats.conversionRate}%`} color="amber" />
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hasRole(user, 'scout', 'owner') && (
          <Link to="/applications?new=1" className="card hover:border-primary-500 transition group">
            <FileText className="text-primary-400 mb-2" size={24} />
            <h3 className="font-semibold text-white group-hover:text-primary-400 transition">Новая анкета</h3>
            <p className="text-sm text-dark-400 mt-1">Добавить кандидата</p>
          </Link>
        )}
        <Link to="/statistics" className="card hover:border-primary-500 transition group">
          <TrendingUp className="text-emerald-400 mb-2" size={24} />
          <h3 className="font-semibold text-white group-hover:text-primary-400 transition">Статистика</h3>
          <p className="text-sm text-dark-400 mt-1">Показатели агентства</p>
        </Link>
        <Link to="/teams" className="card hover:border-primary-500 transition group">
          <Users className="text-violet-400 mb-2" size={24} />
          <h3 className="font-semibold text-white group-hover:text-primary-400 transition">Команды</h3>
          <p className="text-sm text-dark-400 mt-1">Иерархия и сотрудники</p>
        </Link>
      </motion.div>

      {/* News */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-semibold text-white mb-4">Новости</h2>
        {posts.length === 0 ? (
          <div className="card text-center text-dark-400 py-10">Нет новостей</div>
        ) : (
          <div className="space-y-4">
            {posts.slice(0, 5).map(post => (
              <Link key={post.id} to={`/posts/${post.id}`} className="card block hover:border-dark-500 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {post.is_pinned === 1 && <Pin size={14} className="text-amber-400" />}
                      <h3 className="font-semibold text-white">{post.title}</h3>
                    </div>
                    <p className="text-sm text-dark-400 mt-1 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                      <span>{post.author_name}</span>
                      <span>{new Date(post.created_at).toLocaleDateString('ru', { timeZone: 'Europe/Moscow' })}</span>
                      <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.comment_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-600/20 text-primary-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
    violet: 'bg-violet-600/20 text-violet-400',
    amber: 'bg-amber-600/20 text-amber-400',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-dark-400">{label}</p>
      </div>
    </div>
  );
}
