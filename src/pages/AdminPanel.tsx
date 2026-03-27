import { useState, useEffect } from 'react';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { Shield, Users, UserPlus, FileText, Activity, Plus, Edit3, Trash2 } from 'lucide-react';

const roleLabels: Record<string, string> = {
  owner: 'Владелец', admin: 'Админ', curator: 'Куратор', hr: 'HR Менеджер', scout: 'Скаут',
};

export default function AdminPanel() {
  const [tab, setTab] = useState<'users' | 'squads' | 'posts' | 'logs'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [squads, setSquads] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showSquadForm, setShowSquadForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', roles: ['scout'] as string[], squad_id: '', team_id: '' });
  const [squadForm, setSquadForm] = useState({ name: '', admin_id: '' });
  const [postForm, setPostForm] = useState({ title: '', content: '', is_pinned: false });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [u, s, l, p] = await Promise.all([
        api.get<any[]>('/users'),
        api.get<any[]>('/squads'),
        api.get<any[]>('/stats/logs'),
        api.get<any[]>('/posts'),
      ]);
      setUsers(u);
      setSquads(s);
      setLogs(l);
      setPosts(p);
    } catch { /* ignore */ }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/users', {
        ...userForm,
        role: userForm.roles.join(','),
        squad_id: userForm.squad_id ? parseInt(userForm.squad_id) : null,
        team_id: userForm.team_id ? parseInt(userForm.team_id) : null,
      });
      toast.success('Пользователь создан!');
      setShowUserForm(false);
      setUserForm({ username: '', password: '', full_name: '', roles: ['scout'], squad_id: '', team_id: '' });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function updateUser(userId: number, data: any) {
    try {
      await api.put(`/users/${userId}`, data);
      toast.success('Пользователь обновлён');
      setEditingUser(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function createSquad(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/squads', { ...squadForm, admin_id: squadForm.admin_id ? parseInt(squadForm.admin_id) : null });
      toast.success('Сквад создан!');
      setShowSquadForm(false);
      setSquadForm({ name: '', admin_id: '' });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/posts', postForm);
      toast.success('Пост опубликован!');
      setShowPostForm(false);
      setPostForm({ title: '', content: '', is_pinned: false });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function deletePost(id: number) {
    if (!confirm('Удалить пост?')) return;
    try {
      await api.delete(`/posts/${id}`);
      toast.success('Пост удалён');
      loadData();
    } catch { /* ignore */ }
  }

  const tabs = [
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'squads', label: 'Сквады', icon: Shield },
    { id: 'posts', label: 'Посты', icon: FileText },
    { id: 'logs', label: 'Логи', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Панель Управления</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900 border border-dark-700 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <button onClick={() => setShowUserForm(!showUserForm)} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Новый пользователь
          </button>

          {showUserForm && (
            <form onSubmit={createUser} className="card space-y-4">
              <h3 className="font-semibold text-white">Создать пользователя</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  className="input-field" placeholder="Логин" required />
                <input value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  className="input-field" placeholder="Пароль" required type="password" />
                <input value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="input-field" placeholder="ФИО" required />
                <div>
                  <p className="text-sm text-dark-300 mb-2">Роли</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1.5 text-sm text-dark-300 cursor-pointer">
                        <input type="checkbox" checked={userForm.roles.includes(key)}
                          onChange={e => {
                            const newRoles = e.target.checked
                              ? [...userForm.roles, key]
                              : userForm.roles.filter(r => r !== key);
                            setUserForm({ ...userForm, roles: newRoles.length ? newRoles : ['scout'] });
                          }}
                          className="w-4 h-4 rounded border-dark-500 bg-dark-800" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <select value={userForm.squad_id} onChange={e => setUserForm({ ...userForm, squad_id: e.target.value })} className="input-field">
                  <option value="">Без сквада</option>
                  {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Создать</button>
                <button type="button" onClick={() => setShowUserForm(false)} className="btn-secondary">Отмена</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="card py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 text-sm font-bold">
                    {u.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{u.full_name}</p>
                    <p className="text-xs text-dark-500">@{u.username} • {u.role.split(',').map((r: string) => roleLabels[r] || r).join(', ')} {u.squad_name ? `• ${u.squad_name}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  <button onClick={() => setEditingUser(editingUser?.id === u.id ? null : u)}
                    className="p-1.5 text-dark-400 hover:text-white transition"><Edit3 size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {editingUser && (
            <EditUserModal
              user={editingUser}
              squads={squads}
              onSave={(data: any) => updateUser(editingUser.id, data)}
              onClose={() => setEditingUser(null)}
            />
          )}
        </div>
      )}

      {/* Squads Tab */}
      {tab === 'squads' && (
        <div className="space-y-4">
          <button onClick={() => setShowSquadForm(!showSquadForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Новый сквад
          </button>

          {showSquadForm && (
            <form onSubmit={createSquad} className="card space-y-4">
              <h3 className="font-semibold text-white">Создать сквад</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={squadForm.name} onChange={e => setSquadForm({ ...squadForm, name: e.target.value })}
                  className="input-field" placeholder="Название сквада" required />
                <select value={squadForm.admin_id} onChange={e => setSquadForm({ ...squadForm, admin_id: e.target.value })} className="input-field">
                  <option value="">Без Team Leader</option>
                  {users.filter(u => u.role.includes('admin')).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Создать</button>
                <button type="button" onClick={() => setShowSquadForm(false)} className="btn-secondary">Отмена</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {squads.map(s => (
              <div key={s.id} className="card py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-dark-500">TL: {s.admin_name || '—'} • {s.member_count} участников</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {tab === 'posts' && (
        <div className="space-y-4">
          <button onClick={() => setShowPostForm(!showPostForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Новый пост
          </button>

          {showPostForm && (
            <form onSubmit={createPost} className="card space-y-4">
              <h3 className="font-semibold text-white">Новый пост</h3>
              <input value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                className="input-field" placeholder="Заголовок" required />
              <textarea value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })}
                className="input-field" rows={5} placeholder="Содержание..." required />
              <label className="flex items-center gap-2 text-sm text-dark-300">
                <input type="checkbox" checked={postForm.is_pinned} onChange={e => setPostForm({ ...postForm, is_pinned: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-500 bg-dark-800" />
                Закрепить пост
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Опубликовать</button>
                <button type="button" onClick={() => setShowPostForm(false)} className="btn-secondary">Отмена</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {posts.map(p => (
              <div key={p.id} className="card py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{p.title}</p>
                  <p className="text-xs text-dark-500">{new Date(p.created_at).toLocaleDateString('ru')} • {p.views} просмотров • {p.comment_count} комментариев</p>
                </div>
                <button onClick={() => deletePost(p.id)} className="p-1.5 text-dark-400 hover:text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="card max-h-[600px] overflow-y-auto">
          <h3 className="font-semibold text-white mb-4">Последние действия</h3>
          {logs.length === 0 ? (
            <p className="text-dark-400">Нет записей</p>
          ) : (
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="p-2 bg-dark-800 rounded text-sm">
                  <span className="text-dark-400">{new Date(l.created_at).toLocaleString('ru')}</span>
                  <span className="text-white ml-2">{l.user_name}: {l.action}</span>
                  {l.details && <span className="text-dark-500 ml-1">{l.details}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditUserModal({ user, squads, onSave, onClose }: any) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    roles: user.role.split(',') as string[],
    squad_id: user.squad_id || '',
    is_active: user.is_active,
    password: '',
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Редактировать: {user.full_name}</h3>
        <div className="space-y-4">
          <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
            className="input-field" placeholder="ФИО" />
          <div>
            <p className="text-sm text-dark-300 mb-2">Роли</p>
            <div className="flex flex-wrap gap-2">
              {(['owner', 'admin', 'curator', 'hr', 'scout'] as const).map(key => (
                <label key={key} className="flex items-center gap-1.5 text-sm text-dark-300 cursor-pointer">
                  <input type="checkbox" checked={form.roles.includes(key)}
                    onChange={e => {
                      const newRoles = e.target.checked
                        ? [...form.roles, key]
                        : form.roles.filter(r => r !== key);
                      setForm({ ...form, roles: newRoles.length ? newRoles : ['scout'] });
                    }}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-800" />
                  {key === 'owner' ? 'Владелец' : key === 'admin' ? 'Админ' : key === 'curator' ? 'Куратор' : key === 'hr' ? 'HR Менеджер' : 'Скаут'}
                </label>
              ))}
            </div>
          </div>
          <select value={form.squad_id} onChange={e => setForm({ ...form, squad_id: e.target.value })} className="input-field">
            <option value="">Без сквада</option>
            {squads.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className="input-field" placeholder="Новый пароль (оставить пустым)" type="password" />
          <label className="flex items-center gap-2 text-sm text-dark-300">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
              className="w-4 h-4" />
            Активен
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSave({ ...form, role: form.roles.join(','), squad_id: form.squad_id ? parseInt(form.squad_id) : null, password: form.password || undefined })}
            className="btn-primary">Сохранить</button>
          <button onClick={onClose} className="btn-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}
