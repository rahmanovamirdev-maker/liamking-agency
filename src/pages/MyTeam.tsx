import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { UsersRound, Calendar, TrendingUp, ChevronDown, ChevronRight, User } from 'lucide-react';

const stagger = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

interface TeamStats {
  id: number; name: string; leader_id: number; leader_name: string;
  member_count: number; total_apps: number; registered: number; rejected: number;
}
interface ScoutStats {
  id: number; full_name: string; avatar: string | null; team_id: number;
  team_name: string; total_apps: number; registered: number; rejected: number;
  last_app_date: string | null;
}
interface Summary { total_apps: number; registered: number; rejected: number; active_scouts: number; }
interface SquadData {
  squad: { id: number; name: string; admin_id: number } | null;
  teams: TeamStats[]; scouts: ScoutStats[]; summary: Summary | null;
}

const periods = [
  { value: 'all', label: 'За всё время' },
  { value: 'year', label: 'За год' },
  { value: 'month', label: 'За месяц' },
  { value: 'week', label: 'За неделю' },
  { value: 'day', label: 'За сегодня' },
];

export default function MyTeam() {
  const { user } = useAuth();
  const [data, setData] = useState<SquadData | null>(null);
  const [period, setPeriod] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [period]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SquadData>(`/stats/my-team?period=${period}`);
      setData(res);
      if (res.teams.length > 0 && expandedTeams.size === 0) {
        setExpandedTeams(new Set(res.teams.map(t => t.id)));
      }
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить данные');
    }
    setLoading(false);
  }

  function toggleTeam(id: number) {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const scoutsByTeam = useMemo(() => {
    if (!data) return {};
    const map: Record<number, ScoutStats[]> = {};
    for (const s of data.scouts) {
      if (!map[s.team_id]) map[s.team_id] = [];
      map[s.team_id].push(s);
    }
    return map;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <UsersRound size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-sm text-dark-400 mt-2">{error}</p>
        <button onClick={loadData} className="btn-primary mt-4">Повторить</button>
      </div>
    );
  }

  if (!data?.squad) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-dark-400">
        <UsersRound size={48} className="mb-4 opacity-50" />
        <p>Вы не привязаны к сквад</p>
      </div>
    );
  }

  const { squad, teams, summary } = data;
  const conversionRate = summary && summary.total_apps > 0
    ? ((summary.registered / summary.total_apps) * 100).toFixed(1) : '0.0';

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Моя команда</h1>
          <p className="text-dark-400 text-sm mt-1">{squad.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-dark-400" />
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input-field w-auto text-sm">
            {periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Squad Summary */}
      {summary && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <StatBox label="Всего анкет" value={summary.total_apps} color="text-primary-400" />
          <StatBox label="Зарегистрировано" value={summary.registered} color="text-emerald-400" />
          <StatBox label="Отклонено" value={summary.rejected} color="text-red-400" />
          <StatBox label="Конверсия" value={`${conversionRate}%`} color="text-amber-400" />
          <StatBox label="Активных скаутов" value={summary.active_scouts} color="text-blue-400" />
        </motion.div>
      )}

      {/* Teams Breakdown */}
      <motion.div variants={fadeUp} className="space-y-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-primary-400" />
          Команды
        </h2>

        {teams.length === 0 ? (
          <div className="card text-center text-dark-400 py-8">Нет команд в этом сквад</div>
        ) : (
          teams.map(team => {
            const isExpanded = expandedTeams.has(team.id);
            const teamConversion = team.total_apps > 0
              ? ((team.registered / team.total_apps) * 100).toFixed(1) : '0.0';
            const teamScouts = scoutsByTeam[team.id] || [];

            return (
              <motion.div key={team.id} layout className="card overflow-hidden">
                {/* Team Header */}
                <button
                  onClick={() => toggleTeam(team.id)}
                  className="w-full flex items-center gap-4 text-left"
                >
                  <div className="text-dark-400">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{team.name}</p>
                    <p className="text-xs text-dark-500">
                      Лидер: {team.leader_name || '—'} · {team.member_count} чел.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <div className="text-center">
                      <p className="font-bold text-white">{team.total_apps}</p>
                      <p className="text-[10px] text-dark-500">Анкет</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-emerald-400">{team.registered}</p>
                      <p className="text-[10px] text-dark-500">Зарег.</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-red-400">{team.rejected}</p>
                      <p className="text-[10px] text-dark-500">Откл.</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-amber-400">{teamConversion}%</p>
                      <p className="text-[10px] text-dark-500">Конв.</p>
                    </div>
                  </div>
                </button>

                {/* Scouts List */}
                {isExpanded && (
                  <div className="mt-4 border-t border-dark-700 pt-3 space-y-2">
                    {teamScouts.length === 0 ? (
                      <p className="text-dark-500 text-sm text-center py-2">Нет скаутов</p>
                    ) : (
                      teamScouts.map(scout => {
                        const scoutConv = scout.total_apps > 0
                          ? ((scout.registered / scout.total_apps) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={scout.id} className="flex items-center gap-3 p-2.5 bg-dark-800 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300 shrink-0">
                              {scout.avatar
                                ? <img src={scout.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                                : <User size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{scout.full_name}</p>
                              {scout.last_app_date && (
                                <p className="text-[10px] text-dark-500">
                                  Посл. анкета: {new Date(scout.last_app_date).toLocaleDateString('ru-RU')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs shrink-0">
                              <span className="text-white font-semibold">{scout.total_apps}</span>
                              <span className="text-emerald-400">{scout.registered} зарег.</span>
                              <span className="text-red-400">{scout.rejected} откл.</span>
                              <span className="text-amber-400 font-medium">{scoutConv}%</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>
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
