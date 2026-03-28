import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, hasRole } from '../contexts/AuthContext';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, User, Phone, MessageCircle, Calendar, UserCircle, Monitor, Briefcase, Globe, Laptop, Languages, Send } from 'lucide-react';
import ApplicationChat from '../components/ApplicationChat';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'На рассмотрении', color: 'bg-yellow-500/20 text-yellow-400' },
  directed: { label: 'Направлена', color: 'bg-blue-500/20 text-blue-400' },
  recorded: { label: 'Записана', color: 'bg-cyan-500/20 text-cyan-400' },
  interview_came: { label: 'Пришла на собеседование', color: 'bg-emerald-500/20 text-emerald-400' },
  interview_noshow: { label: 'Не пришла на собеседование', color: 'bg-orange-500/20 text-orange-400' },
  interview_ignored: { label: 'Игнор собеседования', color: 'bg-gray-500/20 text-gray-400' },
  registration: { label: 'Регистрация', color: 'bg-green-500/20 text-green-400' },
  active: { label: 'Активна', color: 'bg-emerald-600/20 text-emerald-300' },
  training: { label: 'На обучении', color: 'bg-indigo-500/20 text-indigo-400' },
  ignored: { label: 'Игнор', color: 'bg-gray-500/20 text-gray-400' },
  rejected: { label: 'Отказ', color: 'bg-red-500/20 text-red-400' },
};

const directionLabels: Record<string, string> = {
  huntme: 'HuntMe',
  mason: 'Mason',
};

// Statuses available per direction + app_type
const directionStatusMap: Record<string, Record<string, string[]>> = {
  huntme: {
    model: ['recorded', 'interview_came', 'registration', 'active', 'interview_noshow', 'rejected', 'interview_ignored'],
    operator: ['recorded', 'interview_came', 'training', 'rejected', 'interview_ignored'],
  },
  mason: {
    model: ['ignored', 'interview_came', 'interview_noshow', 'registration', 'rejected'],
    operator: ['ignored', 'interview_came', 'interview_noshow', 'registration', 'rejected'],
  },
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadApp();
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

  async function directToPartner(direction: string) {
    try {
      await api.put(`/applications/${id}/direction`, { direction });
      toast.success(`Анкета направлена на ${directionLabels[direction]}`);
      loadApp();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function changeStatus(newStatus: string) {
    try {
      await api.put(`/applications/${id}/status`, {
        status: newStatus,
        comment,
        rejection_reason: newStatus === 'rejected' ? rejectionReason : undefined,
      });
      toast.success('Статус обновлён');
      setComment('');
      setRejectionReason('');
      loadApp();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (!app) return <div className="text-center py-10 text-dark-400">Загрузка...</div>;

  // Determine available statuses for HR based on direction + app_type
  const availableStatuses = (() => {
    if (!app.direction) return [];
    if (hasRole(user, 'owner')) {
      return directionStatusMap[app.direction]?.[app.app_type] || [];
    }
    if (hasRole(user, 'hr_huntme') && app.direction === 'huntme') {
      return directionStatusMap.huntme[app.app_type] || [];
    }
    if (hasRole(user, 'hr_mason') && app.direction === 'mason') {
      return directionStatusMap.mason[app.app_type] || [];
    }
    return [];
  })();

  const canDirectApp = hasRole(user, 'owner', 'admin') && app.status === 'pending_review';
  const canRejectPending = hasRole(user, 'owner', 'admin') && app.status === 'pending_review';
  const canChangeStatus = availableStatuses.length > 0 && app.status !== 'pending_review';

  const chatAccess = hasRole(user, 'owner') || [
    app.scout_id, app.admin_id, app.curator_id, app.hr_id
  ].includes(user?.id) || hasRole(user, 'hr_huntme', 'hr_mason');

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-white transition">
        <ArrowLeft size={18} /> Назад
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{app.candidate_name}</h1>
          <p className="text-dark-400 mt-1">
            Анкета #{app.id}
            {app.direction && (
              <span className={`ml-2 badge ${app.direction === 'huntme' ? 'bg-violet-500/20 text-violet-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {directionLabels[app.direction]}
              </span>
            )}
          </p>
        </div>
        <span className={`badge text-sm px-3 py-1 ${statusLabels[app.status]?.color || 'bg-dark-700 text-dark-300'}`}>
          {statusLabels[app.status]?.label || app.status}
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

          {/* Direction selection (admin review) */}
          {canDirectApp && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Send size={18} /> Направить на партнёра
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => directToPartner('huntme')}
                  className="p-4 rounded-xl border-2 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition text-center">
                  <p className="text-lg font-bold text-violet-400">HuntMe</p>
                  <p className="text-xs text-dark-400 mt-1">Направить анкету</p>
                </button>
                <button onClick={() => directToPartner('mason')}
                  className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition text-center">
                  <p className="text-lg font-bold text-amber-400">Mason</p>
                  <p className="text-xs text-dark-400 mt-1">Направить анкету</p>
                </button>
              </div>
              {canRejectPending && (
                <div className="mt-4">
                  <button onClick={() => changeStatus('rejected')} className="btn-danger">
                    Отклонить анкету
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status change (HR within direction) */}
          {canChangeStatus && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Изменить статус</h2>

              <div className="mb-4">
                <label className="block text-sm text-dark-300 mb-1">Комментарий</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  className="input-field" rows={2} placeholder="Добавьте комментарий..." />
              </div>

              <div className="flex flex-wrap gap-2">
                {availableStatuses.filter(s => s !== 'rejected').map(s => (
                  <button key={s} onClick={() => changeStatus(s)} className="btn-primary">
                    {statusLabels[s]?.label || s}
                  </button>
                ))}
                {availableStatuses.includes('rejected') && (
                  <div className="w-full mt-2 space-y-2">
                    <input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                      className="input-field" placeholder="Причина отказа..." />
                    <button onClick={() => changeStatus('rejected')} className="btn-danger">
                      Отказ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection reason display */}
          {app.status === 'rejected' && app.rejection_reason && (
            <div className="card border-red-500/30">
              <h2 className="text-lg font-semibold text-red-400 mb-2">Причина отказа</h2>
              <p className="text-white">{app.rejection_reason}</p>
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
                        <span className={`badge text-xs ${statusLabels[h.new_status]?.color || 'bg-dark-700 text-dark-300'}`}>
                          {statusLabels[h.new_status]?.label || h.new_status}
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
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Детали</h3>
            <div className="space-y-2 text-sm">
              {app.direction && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Направление</span>
                  <span className={app.direction === 'huntme' ? 'text-violet-400' : 'text-amber-400'}>
                    {directionLabels[app.direction]}
                  </span>
                </div>
              )}
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
