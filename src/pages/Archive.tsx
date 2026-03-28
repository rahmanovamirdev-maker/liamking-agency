import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Archive as ArchiveIcon, Search, ChevronRight, Trash2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending_review: 'bg-yellow-500/20 text-yellow-400',
  directed: 'bg-blue-500/20 text-blue-400',
  recorded: 'bg-cyan-500/20 text-cyan-400',
  interview_came: 'bg-emerald-500/20 text-emerald-400',
  interview_noshow: 'bg-orange-500/20 text-orange-400',
  interview_ignored: 'bg-gray-500/20 text-gray-400',
  registration: 'bg-green-500/20 text-green-400',
  active: 'bg-emerald-600/20 text-emerald-300',
  training: 'bg-indigo-500/20 text-indigo-400',
  ignored: 'bg-gray-500/20 text-gray-400',
  rejected: 'bg-red-500/20 text-red-400',
};

function getStatusLabel(status: string, appType?: string): string {
  const labels: Record<string, { f: string; m: string }> = {
    pending_review: { f: 'На рассмотрении', m: 'На рассмотрении' },
    directed: { f: 'Направлена', m: 'Направлен' },
    recorded: { f: 'Записана', m: 'Записан' },
    interview_came: { f: 'Пришла на собеседование', m: 'Пришёл на собеседование' },
    interview_noshow: { f: 'Не пришла на собеседование', m: 'Не пришёл на собеседование' },
    interview_ignored: { f: 'Игнор собеседования', m: 'Игнор собеседования' },
    registration: { f: 'Регистрация', m: 'Регистрация' },
    active: { f: 'Активна', m: 'Активен' },
    training: { f: 'На обучении', m: 'На обучении' },
    ignored: { f: 'Игнор', m: 'Игнор' },
    rejected: { f: 'Отказ', m: 'Отказ' },
  };
  const entry = labels[status];
  if (!entry) return status;
  return appType === 'operator' ? entry.m : entry.f;
}

export default function Archive() {
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadApps(); }, [page]);

  async function loadApps() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (search) params.set('search', search);
      const data = await api.get<any>(`/applications?${params}`);
      setApps(data.applications);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function deleteApp(id: number, name: string) {
    if (!confirm(`Удалить анкету "${name}" безвозвратно?`)) return;
    try {
      await api.delete(`/applications/${id}`);
      setApps(prev => prev.filter(a => a.id !== id));
      setTotal(prev => prev - 1);
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArchiveIcon className="text-primary-400" size={28} />
        <h1 className="text-2xl font-bold text-white">Архив анкет</h1>
        <span className="text-dark-400 text-sm">Всего: {total}</span>
      </div>

      <form onSubmit={e => { e.preventDefault(); setPage(1); loadApps(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9" placeholder="Поиск по имени, телефону, email..." />
        </div>
        <button type="submit" className="btn-secondary">Найти</button>
      </form>

      {loading ? (
        <div className="text-center py-10 text-dark-400">Загрузка...</div>
      ) : apps.length === 0 ? (
        <div className="card text-center text-dark-400 py-10">Нет записей</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-dark-400 font-medium">ID</th>
                  <th className="text-left py-2 px-3 text-dark-400 font-medium">Кандидат</th>
                  <th className="text-left py-2 px-3 text-dark-400 font-medium">Телефон</th>
                  <th className="text-left py-2 px-3 text-dark-400 font-medium">Статус</th>
                  <th className="text-left py-2 px-3 text-dark-400 font-medium">Скаут</th>
                  <th className="text-left py-2 px-3 text-dark-400 font-medium">Сквад</th>
                  <th className="text-left py-2 px-3 text-dark-400 font-medium">Дата</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => (
                  <tr key={app.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                    <td className="py-2 px-3 text-dark-400">#{app.id}</td>
                    <td className="py-2 px-3 text-white font-medium">{app.candidate_name}</td>
                    <td className="py-2 px-3 text-dark-300">{app.candidate_phone || '—'}</td>
                    <td className="py-2 px-3">
                      <span className={`badge ${statusColors[app.status] || 'bg-dark-700 text-dark-300'}`}>
                        {getStatusLabel(app.status, app.app_type)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-dark-300">{app.scout_name}</td>
                    <td className="py-2 px-3 text-dark-300">{app.squad_name || '—'}</td>
                    <td className="py-2 px-3 text-dark-400">{new Date(app.created_at).toLocaleDateString('ru')}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/applications/${app.id}`} className="text-primary-400 hover:text-primary-300">
                          <ChevronRight size={16} />
                        </Link>
                        <button onClick={() => deleteApp(app.id, app.candidate_name)} className="text-red-500/60 hover:text-red-400 transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">Назад</button>
            <span className="text-dark-400 text-sm">Стр. {page} / {Math.ceil(total / 50)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={apps.length < 50} className="btn-secondary text-sm">Далее</button>
          </div>
        </>
      )}
    </div>
  );
}
