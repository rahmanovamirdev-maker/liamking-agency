import { useState, useEffect } from 'react';
import { useAuth, hasRole } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronRight, UserCircle, Monitor } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const statusColors: Record<string, string> = {
  directed: 'bg-blue-500/20 text-blue-400',
  recorded: 'bg-cyan-500/20 text-cyan-400',
  interview_came: 'bg-emerald-500/20 text-emerald-400',
  interview_noshow: 'bg-orange-500/20 text-orange-400',
  interview_ignored: 'bg-gray-500/20 text-gray-400',
  registration: 'bg-green-500/20 text-green-400',
  active: 'bg-emerald-600/20 text-emerald-300',
  training: 'bg-indigo-500/20 text-indigo-400',
  rejected: 'bg-red-500/20 text-red-400',
};

const statusLabelsGendered: Record<string, { f: string; m: string }> = {
  directed: { f: 'Направлена', m: 'Направлен' },
  recorded: { f: 'Записана', m: 'Записан' },
  interview_came: { f: 'Пришла на собеседование', m: 'Пришёл на собеседование' },
  interview_noshow: { f: 'Не пришла на собеседование', m: 'Не пришёл на собеседование' },
  interview_ignored: { f: 'Игнор собеседования', m: 'Игнор собеседования' },
  registration: { f: 'Регистрация', m: 'Регистрация' },
  active: { f: 'Активна', m: 'Активен' },
  training: { f: 'На обучении', m: 'На обучении' },
  rejected: { f: 'Отказ', m: 'Отказ' },
};

function getStatusLabel(status: string, appType?: string): string {
  const entry = statusLabelsGendered[status];
  if (!entry) return status;
  return appType === 'operator' ? entry.m : entry.f;
}

const typeLabels: Record<string, { label: string; icon: typeof UserCircle }> = {
  model: { label: 'Модель', icon: UserCircle },
  operator: { label: 'Оператор', icon: Monitor },
};

export default function HuntMe() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadApps(); }, [statusFilter, typeFilter]);

  async function loadApps() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('direction', 'huntme');
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('app_type', typeFilter);
      if (search) params.set('search', search);
      const data = await api.get<any>(`/applications?${params}`);
      setApps(data.applications);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadApps();
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <span className="text-violet-400 font-bold text-sm">HM</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">HuntMe</h1>
          <p className="text-sm text-dark-400">Анкеты направленные на HuntMe</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9" placeholder="Поиск по имени, телефону, телеграму..." />
          </div>
          <button type="submit" className="btn-secondary">Найти</button>
        </form>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-dark-400" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-auto">
            <option value="">Все типы</option>
            <option value="model">Модель</option>
            <option value="operator">Оператор</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
            <option value="">Все статусы</option>
            {Object.entries(statusLabelsGendered).map(([key, { f }]) => (
              <option key={key} value={key}>{f}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Applications list */}
      <motion.div variants={fadeUp} className="text-sm text-dark-400 mb-2">Найдено: {total}</motion.div>

      {loading ? (
        <div className="text-center py-10 text-dark-400">Загрузка...</div>
      ) : apps.length === 0 ? (
        <div className="card text-center py-10 text-dark-400">Анкеты не найдены</div>
      ) : (
        <motion.div className="space-y-2" variants={stagger} initial="hidden" animate="visible">
          {apps.map(app => {
            const TypeIcon = typeLabels[app.app_type]?.icon || UserCircle;
            return (
              <motion.div key={app.id} variants={fadeUp}>
                <Link to={`/applications/${app.id}`}
                  className="card flex items-center justify-between hover:border-violet-500/30 transition py-4 px-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <TypeIcon size={18} className="text-dark-400 shrink-0" />
                      <h3 className="font-medium text-white">{app.candidate_name}</h3>
                      <span className="badge bg-dark-700 text-dark-300 text-xs">
                        {typeLabels[app.app_type]?.label || app.app_type}
                      </span>
                      <span className={`badge ${statusColors[app.status] || 'bg-dark-700 text-dark-300'}`}>
                        {getStatusLabel(app.status, app.app_type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-dark-500 ml-8">
                      {app.candidate_phone && <span>{app.candidate_phone}</span>}
                      {app.candidate_telegram && <span>TG: {app.candidate_telegram}</span>}
                      <span>Скаут: {app.scout_name}</span>
                      {app.squad_name && <span>Сквад: {app.squad_name}</span>}
                      <span>{new Date(app.created_at).toLocaleDateString('ru')}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-dark-500" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
