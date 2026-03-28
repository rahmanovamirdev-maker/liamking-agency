import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth, hasRole } from '../contexts/AuthContext';
import { Users, ChevronDown, ChevronRight, Crown, Shield, UserCheck, Plus, Trash2, Edit3, UserMinus, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const roleLabels: Record<string, string> = {
  owner: 'Владелец', team_leader: 'Сквад Лидер', admin: 'Админ', curator: 'Куратор', hr: 'HR', hr_huntme: 'HR HuntMe', hr_mason: 'HR Mason', scout: 'Скаут',
};

export default function Teams() {
  const { user } = useAuth();
  const isManager = hasRole(user, 'owner', 'team_leader');
  const [squads, setSquads] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Forms
  const [showCreateSquad, setShowCreateSquad] = useState(false);
  const [squadForm, setSquadForm] = useState({ name: '', admin_id: '' });
  const [editingSquad, setEditingSquad] = useState<any>(null);
  const [editSquadForm, setEditSquadForm] = useState({ name: '', admin_id: '' });

  const [creatingTeamForSquad, setCreatingTeamForSquad] = useState<number | null>(null);
  const [teamForm, setTeamForm] = useState({ name: '', leader_id: '' });
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editTeamForm, setEditTeamForm] = useState({ name: '', leader_id: '' });

  const [addingMemberToTeam, setAddingMemberToTeam] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; name: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [data, users] = await Promise.all([
        api.get<any[]>('/squads'),
        isManager ? api.get<any[]>('/users') : Promise.resolve([]),
      ]);
      const detailed = await Promise.all(
        data.map(s => api.get<any>(`/squads/${s.id}/hierarchy`).catch(() => s))
      );
      setSquads(detailed);
      setAllUsers(users);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function toggleSquad(id: number) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // --- Squad CRUD ---
  async function createSquad(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/squads', { name: squadForm.name, admin_id: squadForm.admin_id ? parseInt(squadForm.admin_id) : null });
      toast.success('Сквад создан');
      setShowCreateSquad(false);
      setSquadForm({ name: '', admin_id: '' });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function updateSquad(id: number) {
    try {
      await api.put(`/squads/${id}`, { name: editSquadForm.name, admin_id: editSquadForm.admin_id ? parseInt(editSquadForm.admin_id) : null });
      toast.success('Сквад обновлён');
      setEditingSquad(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function deleteSquad(id: number) {
    try {
      await api.delete(`/squads/${id}`);
      toast.success('Сквад удалён');
      setConfirmDelete(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  // --- Team CRUD ---
  async function createTeam(squadId: number, e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/squads/${squadId}/teams`, { name: teamForm.name, leader_id: teamForm.leader_id ? parseInt(teamForm.leader_id) : null });
      toast.success('Команда создана');
      setCreatingTeamForSquad(null);
      setTeamForm({ name: '', leader_id: '' });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function updateTeam(teamId: number) {
    try {
      await api.put(`/squads/teams/${teamId}`, { name: editTeamForm.name, leader_id: editTeamForm.leader_id ? parseInt(editTeamForm.leader_id) : null });
      toast.success('Команда обновлена');
      setEditingTeam(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function deleteTeam(teamId: number) {
    try {
      await api.delete(`/squads/teams/${teamId}`);
      toast.success('Команда удалена');
      setConfirmDelete(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  // --- Members ---
  async function addMember(teamId: number) {
    if (!selectedUserId) return;
    try {
      await api.post(`/squads/teams/${teamId}/members`, { user_id: parseInt(selectedUserId) });
      toast.success('Участник добавлен');
      setAddingMemberToTeam(null);
      setSelectedUserId('');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function removeMember(teamId: number, userId: number) {
    try {
      await api.delete(`/squads/teams/${teamId}/members/${userId}`);
      toast.success('Участник удалён');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  // Get users not in any team for adding
  const availableUsers = allUsers.filter(u => !u.team_id);

  if (loading) return <div className="text-center py-10 text-dark-400">Загрузка...</div>;

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Команды и иерархия</h1>
        <div className="flex items-center gap-3">
          <span className="text-dark-400 text-sm">{squads.length} сквадов</span>
          {isManager && (
            <button onClick={() => setShowCreateSquad(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Новый сквад
            </button>
          )}
        </div>
      </div>

      {/* Hierarchy legend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-dark-300 mb-3">Иерархия</h3>
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <span className="text-amber-400 font-medium">Владелец</span>
          <span>→</span>
          <span className="text-blue-400 font-medium">Сквад Лидеры</span>
          <span>→</span>
          <span className="text-purple-400 font-medium">Основы (Squads)</span>
          <span>→</span>
          <span className="text-emerald-400 font-medium">Скауты</span>
        </div>
      </div>

      {/* Create Squad Form */}
      {showCreateSquad && (
        <motion.form onSubmit={createSquad} variants={fadeUp} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Создать сквад</h3>
            <button type="button" onClick={() => setShowCreateSquad(false)} className="text-dark-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={squadForm.name} onChange={e => setSquadForm({ ...squadForm, name: e.target.value })}
              className="input-field" placeholder="Название сквада" required />
            <select value={squadForm.admin_id} onChange={e => setSquadForm({ ...squadForm, admin_id: e.target.value })} className="input-field">
              <option value="">Без Team Leader</option>
              {allUsers.filter(u => u.role.includes('team_leader')).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Создать</button>
            <button type="button" onClick={() => setShowCreateSquad(false)} className="btn-secondary">Отмена</button>
          </div>
        </motion.form>
      )}

      {squads.length === 0 ? (
        <div className="card text-center text-dark-400 py-10">Нет команд</div>
      ) : (
        <motion.div className="space-y-3" variants={stagger} initial="hidden" animate="visible">
          {squads.map(squad => (
            <motion.div key={squad.id} variants={fadeUp} className="card">
              {/* Squad Header */}
              {editingSquad === squad.id ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-white text-sm">Редактировать сквад</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input value={editSquadForm.name} onChange={e => setEditSquadForm({ ...editSquadForm, name: e.target.value })}
                      className="input-field" placeholder="Название" />
                    <select value={editSquadForm.admin_id} onChange={e => setEditSquadForm({ ...editSquadForm, admin_id: e.target.value })} className="input-field">
                      <option value="">Без Team Leader</option>
                      {allUsers.filter(u => u.role.includes('team_leader')).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateSquad(squad.id)} className="btn-primary text-sm">Сохранить</button>
                    <button onClick={() => setEditingSquad(null)} className="btn-secondary text-sm">Отмена</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button onClick={() => toggleSquad(squad.id)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                      <Shield size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">{squad.name}</h2>
                      <p className="text-sm text-dark-400">
                        Team Leader: {squad.admin_name || '—'} • {squad.member_count || squad.teams?.reduce((a: number, t: any) => a + (t.members?.length || 0), 0) || 0} участников
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {isManager && (
                      <>
                        <button onClick={() => { setEditingSquad(squad.id); setEditSquadForm({ name: squad.name, admin_id: squad.admin_id?.toString() || '' }); }}
                          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-blue-400 transition-colors" title="Редактировать">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => setConfirmDelete({ type: 'squad', id: squad.id, name: squad.name })}
                          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-red-400 transition-colors" title="Удалить">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {expanded[squad.id] ? <ChevronDown size={20} className="text-dark-400" /> : <ChevronRight size={20} className="text-dark-400" />}
                  </div>
                </div>
              )}

              {/* Expanded content */}
              {expanded[squad.id] && (
                <div className="mt-4 ml-6 space-y-4">
                  {isManager && (
                    <div>
                      {creatingTeamForSquad === squad.id ? (
                        <form onSubmit={(e) => createTeam(squad.id, e)} className="flex items-center gap-2 mb-3">
                          <input value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                            className="input-field flex-1" placeholder="Название команды" required />
                          <select value={teamForm.leader_id} onChange={e => setTeamForm({ ...teamForm, leader_id: e.target.value })} className="input-field">
                            <option value="">Без лидера</option>
                            {allUsers.filter(u => u.role.includes('curator') || u.role.includes('admin') || u.role.includes('team_leader')).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                          </select>
                          <button type="submit" className="btn-primary text-sm whitespace-nowrap">Создать</button>
                          <button type="button" onClick={() => setCreatingTeamForSquad(null)} className="btn-secondary text-sm">✕</button>
                        </form>
                      ) : (
                        <button onClick={() => setCreatingTeamForSquad(squad.id)}
                          className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 mb-3">
                          <Plus size={14} /> Добавить команду
                        </button>
                      )}
                    </div>
                  )}

                  {squad.teams && squad.teams.length === 0 ? (
                    <p className="text-sm text-dark-500">Нет команд в сквадe</p>
                  ) : (
                    squad.teams?.map((team: any) => (
                      <div key={team.id} className="border-l-2 border-dark-600 pl-4">
                        {/* Team Header */}
                        {editingTeam === team.id ? (
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2">
                              <input value={editTeamForm.name} onChange={e => setEditTeamForm({ ...editTeamForm, name: e.target.value })}
                                className="input-field flex-1" placeholder="Название" />
                              <select value={editTeamForm.leader_id} onChange={e => setEditTeamForm({ ...editTeamForm, leader_id: e.target.value })} className="input-field">
                                <option value="">Без лидера</option>
                                {allUsers.filter(u => u.role.includes('curator') || u.role.includes('admin') || u.role.includes('team_leader')).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                              </select>
                              <button onClick={() => updateTeam(team.id)} className="btn-primary text-sm">Ок</button>
                              <button onClick={() => setEditingTeam(null)} className="btn-secondary text-sm">✕</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
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
                            {isManager && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setEditingTeam(team.id); setEditTeamForm({ name: team.name, leader_id: team.leader_id?.toString() || '' }); }}
                                  className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-blue-400 transition-colors" title="Редактировать">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => setConfirmDelete({ type: 'team', id: team.id, name: team.name })}
                                  className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400 transition-colors" title="Удалить">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Members */}
                        {team.members && team.members.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {team.members.map((member: any) => (
                              <div key={member.id} className="flex items-center justify-between group py-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-xs text-white font-bold">
                                    {member.full_name.charAt(0)}
                                  </div>
                                  <span className="text-sm text-white">{member.full_name}</span>
                                  <span className="text-xs text-dark-500">{member.role.split(',').map((r: string) => roleLabels[r] || r).join(', ')}</span>
                                </div>
                                {isManager && (
                                  <button onClick={() => removeMember(team.id, member.id)}
                                    className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Убрать из команды">
                                    <UserMinus size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add member */}
                        {isManager && (
                          <div className="ml-4 mt-2">
                            {addingMemberToTeam === team.id ? (
                              <div className="flex items-center gap-2">
                                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="input-field text-sm flex-1">
                                  <option value="">Выберите участника</option>
                                  {availableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role.split(',').map((r: string) => roleLabels[r] || r).join(', ')})</option>)}
                                </select>
                                <button onClick={() => addMember(team.id)} className="btn-primary text-xs px-2 py-1">Добавить</button>
                                <button onClick={() => { setAddingMemberToTeam(null); setSelectedUserId(''); }} className="btn-secondary text-xs px-2 py-1">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setAddingMemberToTeam(team.id)}
                                className="flex items-center gap-1 text-xs text-dark-500 hover:text-emerald-400 transition-colors">
                                <UserPlus size={12} /> Добавить участника
                              </button>
                            )}
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

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <Trash2 size={32} className="text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Удалить {confirmDelete.type === 'squad' ? 'сквад' : 'команду'}?</h3>
            <p className="text-dark-400 text-sm mb-4">
              «{confirmDelete.name}» будет удалён{confirmDelete.type === 'squad' ? '' : 'а'} безвозвратно.
              {confirmDelete.type === 'squad' && ' Все команды и участники будут откреплены.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => confirmDelete.type === 'squad' ? deleteSquad(confirmDelete.id) : deleteTeam(confirmDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Удалить</button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
