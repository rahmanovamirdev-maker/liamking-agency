import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, ChevronDown, ChevronRight, Crown, Shield, UserCheck } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const roleIcons: Record<string, any> = {
  owner: Crown, admin: Shield, curator: UserCheck, hr: Users, scout: Users,
};
const roleLabels: Record<string, string> = {
  owner: 'Владелец', admin: 'Админ', curator: 'Куратор', hr: 'HR', scout: 'Скаут',
};

export default function Teams() {
  const { user } = useAuth();
  const [squads, setSquads] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSquads();
  }, []);

  async function loadSquads() {
    try {
      const data = await api.get<any[]>('/squads');
      setSquads(data);
      // Load hierarchy for each squad
      const detailed = await Promise.all(
        data.map(s => api.get<any>(`/squads/${s.id}/hierarchy`).catch(() => s))
      );
      setSquads(detailed);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function toggleSquad(id: number) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) return <div className="text-center py-10 text-dark-400">Загрузка...</div>;

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Команды и иерархия</h1>
        <span className="text-dark-400 text-sm">{squads.length} сквадов</span>
      </div>

      {/* Hierarchy legend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-dark-300 mb-3">Иерархия</h3>
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <span className="text-amber-400 font-medium">Владелец</span>
          <span>→</span>
          <span className="text-blue-400 font-medium">Админы (Team Leaders)</span>
          <span>→</span>
          <span className="text-purple-400 font-medium">Основы (Squads)</span>
          <span>→</span>
          <span className="text-emerald-400 font-medium">Скауты</span>
        </div>
      </div>

      {squads.length === 0 ? (
        <div className="card text-center text-dark-400 py-10">Нет команд</div>
      ) : (
        <motion.div className="space-y-3" variants={stagger} initial="hidden" animate="visible">
          {squads.map(squad => (
            <motion.div key={squad.id} variants={fadeUp} className="card">
              <button
                onClick={() => toggleSquad(squad.id)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Shield size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{squad.name}</h2>
                    <p className="text-sm text-dark-400">
                      Team Leader: {squad.admin_name || '—'} • {squad.member_count || squad.teams?.reduce((a: number, t: any) => a + (t.members?.length || 0), 0) || 0} участников
                    </p>
                  </div>
                </div>
                {expanded[squad.id] ? <ChevronDown size={20} className="text-dark-400" /> : <ChevronRight size={20} className="text-dark-400" />}
              </button>

              {expanded[squad.id] && squad.teams && (
                <div className="mt-4 ml-6 space-y-4">
                  {squad.teams.length === 0 ? (
                    <p className="text-sm text-dark-500">Нет команд в сквадe</p>
                  ) : (
                    squad.teams.map((team: any) => (
                      <div key={team.id} className="border-l-2 border-dark-600 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                            <Users size={16} className="text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white text-sm">{team.name}</h3>
                            <p className="text-xs text-dark-500">
                              Лидер: {team.leader_name || '—'} • {team.members?.length || 0} участников
                            </p>
                          </div>
                        </div>
                        {team.members && team.members.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {team.members.map((member: any) => {
                              const primaryRole = member.role.split(',')[0];
                              const RoleIcon = roleIcons[primaryRole] || Users;
                              return (
                                <div key={member.id} className="flex items-center gap-2 py-1">
                                  <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-xs text-white font-bold">
                                    {member.full_name.charAt(0)}
                                  </div>
                                  <span className="text-sm text-white">{member.full_name}</span>
                                  <span className="text-xs text-dark-500">{member.role.split(',').map((r: string) => roleLabels[r] || r).join(', ')}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
