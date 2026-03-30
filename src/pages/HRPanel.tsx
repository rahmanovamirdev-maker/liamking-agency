import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Briefcase, ChevronRight } from 'lucide-react';

const statusLabels: Record<string, { label: string; color: string }> = {
  registration: { label: 'На регистрации', color: 'bg-emerald-500/20 text-emerald-400' },
  rejected: { label: 'Отказано', color: 'bg-red-500/20 text-red-400' },
};

export default function HRPanel() {
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>('/applications?status=registration').then(d => setPending(d.applications)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="text-primary-400" size={28} />
        <h1 className="text-2xl font-bold text-white">HR Панель</h1>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{pending.length}</p>
          <p className="text-sm text-dark-400">На регистрации</p>
        </div>
      </div>

      <Section title="На регистрации" apps={pending} />
    </div>
  );
}

function Section({ title, apps }: { title: string; apps: any[] }) {
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
                {app.candidate_phone} • Скаут: {app.scout_name} • {new Date(app.created_at).toLocaleDateString('ru', { timeZone: 'Europe/Moscow' })}
              </p>
            </div>
            <ChevronRight size={18} className="text-dark-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
