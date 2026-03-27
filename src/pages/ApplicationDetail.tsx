import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, hasRole } from '../contexts/AuthContext';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, User, Phone, MessageCircle, Calendar, UserCircle, Monitor, Briefcase, Globe, Laptop, Languages } from 'lucide-react';
import ApplicationChat from '../components/ApplicationChat';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'На рассмотрении', color: 'bg-yellow-500/20 text-yellow-400' },
  reviewed: { label: 'Рассмотрено', color: 'bg-blue-500/20 text-blue-400' },
  interviewing: { label: 'На собеседовании', color: 'bg-purple-500/20 text-purple-400' },
  no_show: { label: 'Не пришёл(ла)', color: 'bg-orange-500/20 text-orange-400' },
  registering: { label: 'На регистрации', color: 'bg-emerald-500/20 text-emerald-400' },
  rejected: { label: 'Отказано', color: 'bg-red-500/20 text-red-400' },
};

const statusTransitions: Record<string, Record<string, string[]>> = {
  owner: {
    pending_review: ['reviewed', 'rejected'],
    reviewed: ['interviewing', 'rejected'],
    interviewing: ['registering', 'no_show', 'rejected'],
    no_show: ['interviewing', 'rejected'],
    registering: ['rejected'],
    rejected: ['pending_review'],
  },
  admin: {
    pending_review: ['reviewed', 'rejected'],
  },
  curator: {
    reviewed: ['interviewing'],
    interviewing: ['registering', 'no_show', 'rejected'],
  },
  hr: {
    registering: ['rejected'],
  },
  scout: {},
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [curators, setCurators] = useState<any[]>([]);
  const [hrs, setHrs] = useState<any[]>([]);
  const [selectedCurator, setSelectedCurator] = useState('');
  const [selectedHr, setSelectedHr] = useState('');

  useEffect(() => {
    loadApp();
    if (hasRole(user, 'owner', 'admin')) {
      api.get<any[]>('/users').then(users => {
        setCurators(users.filter(u => u.role.includes('curator')));
        setHrs(users.filter(u => u.role.includes('hr')));
      }).catch(() => {});
    }
  }, [id]);

  async function loadApp() {
    try {
      const data = await api.get<any>(`/applications/${id}`);
      setApp(data);
    } catch {
      toast.error('Анкета не найдена');
      navigate('/applications');
    }
  }

  async function changeStatus(newStatus: string) {
    try {
      await api.put(`/applications/${id}/status`, {
        status: newStatus,
        comment,
        curator_id: selectedCurator || undefined,
        hr_id: selectedHr || undefined,
      });
      toast.success('Статус обновлён');
      setComment('');
      loadApp();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (!app) return <div className="text-center py-10 text-dark-400">Загрузка...</div>;

  const transitions = (() => {
    const userRoles = user?.roles || ['scout'];
    const merged = new Set<string>();
    for (const r of userRoles) {
      const t = statusTransitions[r]?.[app.status];
      if (t) t.forEach(s => merged.add(s));
    }
    return Array.from(merged);
  })();

  const chatAccess = hasRole(user, 'owner') || [
    app.scout_id, app.admin_id, app.curator_id, app.hr_id
  ].includes(user?.id);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-white transition">
        <ArrowLeft size={18} /> Назад
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{app.candidate_name}</h1>
          <p className="text-dark-400 mt-1">Анкета #{app.id}</p>
        </div>
        <span className={`badge text-sm px-3 py-1 ${statusLabels[app.status]?.color}`}>
          {statusLabels[app.status]?.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-white">Информация о кандидате</h2>
              <span className="badge bg-dark-700 text-dark-300 text-xs">
                {app.app_type === 'model' ? 'Модель' : app.app_type === 'operator' ? 'Оператор' : app.app_type}
              </span>
            </div>
            {/* Common fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow icon={User} label="Имя" value={app.candidate_name} />
              <InfoRow icon={Calendar} label="Возраст" value={app.candidate_age || '—'} />
              <InfoRow icon={Phone} label="Телефон" value={app.candidate_phone || '—'} />
              <InfoRow icon={MessageCircle} label="Телеграм" value={app.candidate_telegram || '—'} />
            </div>

            {/* Model-specific fields */}
            {app.app_type === 'model' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow icon={UserCircle} label="Как представились" value={app.intro_name || '—'} />
                  <InfoRow icon={Briefcase} label="Вакансия" value={app.vacancy_title || '—'} />
                  <InfoRow icon={Languages} label="Языки" value={app.languages || '—'} />
                  <InfoRow icon={Globe} label="Должность/роль" value={app.intro_role || '—'} />
                </div>
                {app.candidate_info && (
                  <div className="p-3 bg-dark-800 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Описание</p>
                    <p className="text-white whitespace-pre-wrap">{app.candidate_info}</p>
                  </div>
                )}
                {app.candidate_photo && (
                  <div className="p-3 bg-dark-800 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Фото</p>
                    <img src={app.candidate_photo} alt="Фото кандидатки" className="max-w-xs rounded-lg mt-2" />
                  </div>
                )}
              </div>
            )}

            {/* Operator-specific fields */}
            {app.app_type === 'operator' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow icon={Briefcase} label="Компания" value={app.company_name || '—'} />
                  <InfoRow icon={Globe} label="Уровень английского" value={app.english_level || '—'} />
                </div>
                {app.work_experience && (
                  <div className="p-3 bg-dark-800 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Опыт работы</p>
                    <p className="text-white whitespace-pre-wrap">{app.work_experience}</p>
                  </div>
                )}
                {app.pc_specs && (
                  <div className="p-3 bg-dark-800 rounded-lg">
                    <p className="text-sm text-dark-300 mb-1">Характеристики ПК</p>
                    <p className="text-white whitespace-pre-wrap">{app.pc_specs}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status change */}
          {transitions.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Изменить статус</h2>

              {hasRole(user, 'admin', 'owner') && app.status === 'pending_review' && (
                <div className="mb-4">
                  <label className="block text-sm text-dark-300 mb-1">Назначить куратора</label>
                  <select value={selectedCurator} onChange={e => setSelectedCurator(e.target.value)} className="input-field">
                    <option value="">Выберите куратора</option>
                    {curators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
              )}

              {hasRole(user, 'curator', 'owner') && app.status === 'interviewing' && (
                <div className="mb-4">
                  <label className="block text-sm text-dark-300 mb-1">Назначить HR менеджера</label>
                  <select value={selectedHr} onChange={e => setSelectedHr(e.target.value)} className="input-field">
                    <option value="">Выберите HR менеджера</option>
                    {hrs.map(h => <option key={h.id} value={h.id}>{h.full_name}</option>)}
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm text-dark-300 mb-1">Комментарий</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  className="input-field" rows={2} placeholder="Добавьте комментарий..." />
              </div>

              <div className="flex flex-wrap gap-2">
                {transitions.map(s => (
                  <button key={s} onClick={() => changeStatus(s)}
                    className={s === 'rejected' ? 'btn-danger' : 'btn-primary'}>
                    {statusLabels[s]?.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat */}
          <ApplicationChat applicationId={app.id} hasAccess={chatAccess} />

          {/* History */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">История изменений</h2>
            {app.history?.length === 0 ? (
              <p className="text-dark-400">Нет записей</p>
            ) : (
              <div className="space-y-3">
                {app.history?.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-dark-800 rounded-lg">
                    <Clock size={16} className="text-dark-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${statusLabels[h.new_status]?.color}`}>
                          {statusLabels[h.new_status]?.label}
                        </span>
                        <span className="text-xs text-dark-500">{h.user_name}</span>
                        <span className="text-xs text-dark-600">{new Date(h.created_at).toLocaleString('ru')}</span>
                      </div>
                      {h.comment && <p className="text-sm text-dark-300 mt-1">{h.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Ответственные</h3>
            <div className="space-y-3 text-sm">
              <PersonRow label="Скаут" name={app.scout_name} />
              <PersonRow label="Админ" name={app.admin_name} />
              <PersonRow label="Куратор" name={app.curator_name} />
              <PersonRow label="HR" name={app.hr_name} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Детали</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-dark-400">Сквад</span><span className="text-white">{app.squad_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-dark-400">Создана</span><span className="text-white">{new Date(app.created_at).toLocaleDateString('ru')}</span></div>
              <div className="flex justify-between"><span className="text-dark-400">Обновлена</span><span className="text-white">{new Date(app.updated_at).toLocaleDateString('ru')}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-dark-400 shrink-0" />
      <div>
        <p className="text-xs text-dark-500">{label}</p>
        <p className="text-white">{value}</p>
      </div>
    </div>
  );
}

function PersonRow({ label, name }: { label: string; name: string | null }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-dark-400">{label}</span>
      <span className="text-white">{name || '—'}</span>
    </div>
  );
}
