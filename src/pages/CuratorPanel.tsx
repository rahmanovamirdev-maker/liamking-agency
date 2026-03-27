import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { UserCheck, ChevronRight } from 'lucide-react';

export default function CuratorPanel() {
  const [reviewed, setReviewed] = useState<any[]>([]);
  const [interviewing, setInterviewing] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>('/applications?status=reviewed').then(d => setReviewed(d.applications)).catch(() => {});
    api.get<any>('/applications?status=interviewing').then(d => setInterviewing(d.applications)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck className="text-primary-400" size={28} />
        <h1 className="text-2xl font-bold text-white">Панель Куратора</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatBox label="Рассмотрено (ожидают)" value={reviewed.length} color="text-blue-400" />
        <StatBox label="На собеседовании" value={interviewing.length} color="text-purple-400" />
      </div>

      <AppSection title="Рассмотренные (ожидают собеседования)" apps={reviewed} />
      <AppSection title="На собеседовании" apps={interviewing} />
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-dark-400">{label}</p>
    </div>
  );
}

function AppSection({ title, apps }: { title: string; apps: any[] }) {
  if (apps.length === 0) return null;
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-2">
        {apps.map(app => (
          <Link key={app.id} to={`/applications/${app.id}`}
            className="card flex items-center justify-between py-3 px-4 hover:border-dark-500 transition">
            <div>
              <p className="font-medium text-white">{app.candidate_name}</p>
              <p className="text-xs text-dark-500">
                {app.candidate_phone} • Скаут: {app.scout_name} • {new Date(app.created_at).toLocaleDateString('ru')}
              </p>
            </div>
            <ChevronRight size={18} className="text-dark-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
