import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, TrendingUp, Trophy, Calendar } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Statistics() {
  const { user } = useAuth();
  const [general, setGeneral] = useState<any>(null);
  const [squadStats, setSquadStats] = useState<any[]>([]);
  const [topAgents, setTopAgents] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any>(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    loadStats();
  }, [period]);

  async function loadStats() {
    try {
      const [gen, squads, top, pers] = await Promise.all([
        api.get<any>(`/stats/general?period=${period}`),
        api.get<any[]>(`/stats/squads?period=${period}`),
        api.get<any[]>(`/stats/top-agents?period=${period}`),
        api.get<any>('/stats/personal/me'),
      ]);
      setGeneral(gen);
      setSquadStats(squads);
      setTopAgents(top);
      setPersonal(pers);
    } catch { /* ignore */ }
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Статистика</h1>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-dark-400" />
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input-field w-auto text-sm">
            <option value="all">За всё время</option>
            <option value="day">За сегодня</option>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
            <option value="year">За год</option>
          </select>
        </div>
      </div>

      {/* General Stats */}
      {general && (
        <>
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="Всего анкет" value={general.totalApplications} color="text-primary-400" />
            <StatBox label="Зарегистрировано" value={general.registered} color="text-emerald-400" />
            <StatBox label="Отклонено" value={general.rejected} color="text-red-400" />
            <StatBox label="Конверсия" value={`${general.conversionRate}%`} color="text-amber-400" />
          </motion.div>

          {/* Status breakdown */}
          <motion.div variants={fadeUp} className="card">
            <h2 className="text-lg font-semibold text-white mb-4">По статусам</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {general.byStatus?.map((s: any) => (
                <div key={s.status} className="bg-dark-800 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-white">{s.count}</p>
                  <p className="text-xs text-dark-400 mt-1">{statusLabel(s.status)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* Squad Stats */}
      {squadStats.length > 0 && (
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-lg font-semibold text-white mb-4">
            <BarChart3 size={20} className="inline mr-2 text-primary-400" />
            Статистика по сквадам
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 text-dark-400 font-medium">Сквад</th>
                  <th className="text-right py-2 text-dark-400 font-medium">Всего</th>
                  <th className="text-right py-2 text-dark-400 font-medium">Зарег.</th>
                  <th className="text-right py-2 text-dark-400 font-medium">Откл.</th>
                  <th className="text-right py-2 text-dark-400 font-medium">Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {squadStats.map(s => (
                  <tr key={s.id} className="border-b border-dark-800">
                    <td className="py-2 text-white font-medium">{s.name}</td>
                    <td className="py-2 text-right text-white">{s.total_apps}</td>
                    <td className="py-2 text-right text-emerald-400">{s.registered}</td>
                    <td className="py-2 text-right text-red-400">{s.rejected}</td>
                    <td className="py-2 text-right text-amber-400">
                      {s.total_apps > 0 ? ((s.registered / s.total_apps) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Top Agents */}
      {topAgents.length > 0 && (
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-lg font-semibold text-white mb-4">
            <Trophy size={20} className="inline mr-2 text-amber-400" />
            Топ агентов
          </h2>
          <div className="space-y-2">
            {topAgents.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-4 p-3 bg-dark-800 rounded-lg">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-dark-700 text-dark-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-white">{agent.full_name}</p>
                  <p className="text-xs text-dark-500">{agent.squad_name || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{agent.total_apps}</p>
                  <p className="text-xs text-emerald-400">Зарег: {agent.registered}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Personal Stats */}
      {personal && (
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-lg font-semibold text-white mb-4">
            <TrendingUp size={20} className="inline mr-2 text-emerald-400" />
            Личная статистика
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="Всего анкет" value={personal.total} color="text-primary-400" />
            <StatBox label="Зарегистрировано" value={personal.registered} color="text-emerald-400" />
            <StatBox label="За неделю" value={personal.thisWeek} color="text-blue-400" />
            <StatBox label="За месяц" value={personal.thisMonth} color="text-violet-400" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-dark-400 mt-1">{label}</p>
    </div>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_review: 'На рассмотрении', directed: 'Направлена',
    recorded: 'Записана', interview_came: 'Пришла на собеседование',
    interview_noshow: 'Не пришла', interview_ignored: 'Игнор собеседования',
    registration: 'Регистрация', active: 'Активна',
    training: 'На обучении', ignored: 'Игнор',
    rejected: 'Отказано',
  };
  return labels[status] || status;
}
