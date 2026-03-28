import { useState, useEffect } from 'react';
import { useAuth, hasRole } from '../contexts/AuthContext';
import { api } from '../api/client';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, ChevronRight, UserCircle, Monitor } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

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

const statusLabelsGendered: Record<string, { f: string; m: string }> = {
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

function getStatusLabel(status: string, appType?: string): string {
  const entry = statusLabelsGendered[status];
  if (!entry) return status;
  return appType === 'operator' ? entry.m : entry.f;
}

const typeLabels: Record<string, { label: string; icon: typeof UserCircle }> = {
  model: { label: 'Модель', icon: UserCircle },
  operator: { label: 'Оператор', icon: Monitor },
};

export default function Applications() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [apps, setApps] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [formType, setFormType] = useState<'model' | 'operator' | ''>('');
  const [loading, setLoading] = useState(true);

  // Model form
  const [modelForm, setModelForm] = useState({
    candidate_name: '', candidate_age: '', candidate_phone: '', candidate_telegram: '',
    intro_name: '', vacancy_title: '', languages: '', intro_role: '', candidate_info: '',
  });

  // Operator form
  const [operatorForm, setOperatorForm] = useState({
    candidate_name: '', candidate_age: '', candidate_phone: '', candidate_telegram: '',
    company_name: '', english_level: '', work_experience: '', pc_specs: '',
  });

  useEffect(() => { loadApps(); }, [statusFilter, typeFilter]);

  async function loadApps() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('app_type', typeFilter);
      if (search) params.set('search', search);
      const data = await api.get<any>(`/applications?${params}`);
      setApps(data.applications);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadApps();
  }

  async function handleSubmitModel(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/applications', { ...modelForm, app_type: 'model' });
      toast.success('Анкета на модель создана!');
      setShowForm(false);
      setFormType('');
      setModelForm({ candidate_name: '', candidate_age: '', candidate_phone: '', candidate_telegram: '', intro_name: '', vacancy_title: '', languages: '', intro_role: '', candidate_info: '' });
      loadApps();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleSubmitOperator(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/applications', { ...operatorForm, app_type: 'operator' });
      toast.success('Анкета на оператора создана!');
      setShowForm(false);
      setFormType('');
      setOperatorForm({ candidate_name: '', candidate_age: '', candidate_phone: '', candidate_telegram: '', company_name: '', english_level: '', work_experience: '', pc_specs: '' });
      loadApps();
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Анкеты</h1>
        {hasRole(user, 'scout', 'owner') && (
          <button onClick={() => { setShowForm(!showForm); setFormType(''); }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Новая анкета
          </button>
        )}
      </div>

      {/* Type selection for new form */}
      {showForm && !formType && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Выберите тип анкеты</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setFormType('model')}
              className="card hover:border-primary-500 transition p-6 text-center">
              <UserCircle size={40} className="text-primary-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-white">Модель</p>
              <p className="text-sm text-dark-400 mt-1">Анкета на модель</p>
            </button>
            <button onClick={() => setFormType('operator')}
              className="card hover:border-primary-500 transition p-6 text-center">
              <Monitor size={40} className="text-primary-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-white">Оператор</p>
              <p className="text-sm text-dark-400 mt-1">Анкета на оператора</p>
            </button>
          </div>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Отмена</button>
        </div>
      )}

      {/* Model form */}
      {showForm && formType === 'model' && (
        <form onSubmit={handleSubmitModel} className="card space-y-4">
          <div className="flex items-center gap-2">
            <UserCircle size={20} className="text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Анкета на модель</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">1. Имя *</label>
              <input value={modelForm.candidate_name} onChange={e => setModelForm({ ...modelForm, candidate_name: e.target.value })}
                className="input-field" placeholder="Имя кандидатки" required />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">2. Сколько полных лет</label>
              <input value={modelForm.candidate_age} onChange={e => setModelForm({ ...modelForm, candidate_age: e.target.value })}
                className="input-field" placeholder="25" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">3. Номер телефона</label>
              <input value={modelForm.candidate_phone} onChange={e => setModelForm({ ...modelForm, candidate_phone: e.target.value })}
                className="input-field" placeholder="+7..." />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">4. Телеграм юзер</label>
              <input value={modelForm.candidate_telegram} onChange={e => setModelForm({ ...modelForm, candidate_telegram: e.target.value })}
                className="input-field" placeholder="@username" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">5. Как представились?</label>
              <input value={modelForm.intro_name} onChange={e => setModelForm({ ...modelForm, intro_name: e.target.value })}
                className="input-field" placeholder="Имя, компания..." />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">6. Вакансия (точное название)</label>
              <input value={modelForm.vacancy_title} onChange={e => setModelForm({ ...modelForm, vacancy_title: e.target.value })}
                className="input-field" placeholder="Название вакансии" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">7. Языки которыми владеет</label>
              <input value={modelForm.languages} onChange={e => setModelForm({ ...modelForm, languages: e.target.value })}
                className="input-field" placeholder="Русский, Английский..." />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">8. Должность и роль для адаптации</label>
              <input value={modelForm.intro_role} onChange={e => setModelForm({ ...modelForm, intro_role: e.target.value })}
                className="input-field" placeholder="HR менеджер..." />
            </div>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">9. Краткое описание</label>
            <textarea value={modelForm.candidate_info} onChange={e => setModelForm({ ...modelForm, candidate_info: e.target.value })}
              className="input-field" rows={3} placeholder="Что рассказали, чего ожидает, что для неё важно..." />
          </div>
          <p className="text-xs text-dark-500">10. Фото кандидатки загружается после создания анкеты</p>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Отправить анкету</button>
            <button type="button" onClick={() => { setFormType(''); }} className="btn-secondary">Назад</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Отмена</button>
          </div>
        </form>
      )}

      {/* Operator form */}
      {showForm && formType === 'operator' && (
        <form onSubmit={handleSubmitOperator} className="card space-y-4">
          <div className="flex items-center gap-2">
            <Monitor size={20} className="text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Анкета на оператора</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">1. Имя *</label>
              <input value={operatorForm.candidate_name} onChange={e => setOperatorForm({ ...operatorForm, candidate_name: e.target.value })}
                className="input-field" placeholder="Имя кандидата" required />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">2. Сколько полных лет</label>
              <input value={operatorForm.candidate_age} onChange={e => setOperatorForm({ ...operatorForm, candidate_age: e.target.value })}
                className="input-field" placeholder="25" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">3. Номер телефона</label>
              <input value={operatorForm.candidate_phone} onChange={e => setOperatorForm({ ...operatorForm, candidate_phone: e.target.value })}
                className="input-field" placeholder="+7..." />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">4. Телеграм юзер</label>
              <input value={operatorForm.candidate_telegram} onChange={e => setOperatorForm({ ...operatorForm, candidate_telegram: e.target.value })}
                className="input-field" placeholder="@username" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">5. Какой компанией представились?</label>
              <input value={operatorForm.company_name} onChange={e => setOperatorForm({ ...operatorForm, company_name: e.target.value })}
                className="input-field" placeholder="Название компании" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">6. Какой уровень английского?</label>
              <select value={operatorForm.english_level} onChange={e => setOperatorForm({ ...operatorForm, english_level: e.target.value })}
                className="input-field">
                <option value="">Выберите уровень</option>
                <option value="A1">A1 — Beginner</option>
                <option value="A2">A2 — Elementary</option>
                <option value="B1">B1 — Intermediate</option>
                <option value="B2">B2 — Upper-Intermediate</option>
                <option value="C1">C1 — Advanced</option>
                <option value="C2">C2 — Proficiency</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-300 mb-1">7. Опыт работы</label>
              <textarea value={operatorForm.work_experience} onChange={e => setOperatorForm({ ...operatorForm, work_experience: e.target.value })}
                className="input-field" rows={2} placeholder="Опыт работы кандидата..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-300 mb-1">8. Характеристики ПК</label>
              <textarea value={operatorForm.pc_specs} onChange={e => setOperatorForm({ ...operatorForm, pc_specs: e.target.value })}
                className="input-field" rows={2} placeholder="Видеокарта, Процессор, скорость интернета..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Отправить анкету</button>
            <button type="button" onClick={() => setFormType('')} className="btn-secondary">Назад</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Отмена</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9" placeholder="Поиск по имени, телефону, телеграму..." />
          </div>
          <button type="submit" className="btn-secondary">Найти</button>
        </form>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-dark-400" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-auto">
            <option value="">Все типы</option>
            <option value="model">Модель</option>
            <option value="operator">Оператор</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
            <option value="">Все статусы</option>
            {Object.entries(statusLabelsGendered).map(([key, { f }]) => (
              <option key={key} value={key}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications list */}
      <div className="text-sm text-dark-400 mb-2">Найдено: {total}</div>

      {loading ? (
        <div className="text-center py-10 text-dark-400">Загрузка...</div>
      ) : apps.length === 0 ? (
        <div className="card text-center py-10 text-dark-400">Анкеты не найдены</div>
      ) : (
        <motion.div className="space-y-2" variants={stagger} initial="hidden" animate="visible">
          {apps.map((app, i) => {
            const TypeIcon = typeLabels[app.app_type]?.icon || UserCircle;
            return (
              <motion.div key={app.id} variants={fadeUp}>
              <Link to={`/applications/${app.id}`}
                className="card flex items-center justify-between hover:border-dark-500 transition py-4 px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <TypeIcon size={18} className="text-dark-400 shrink-0" />
                    <h3 className="font-medium text-white">{app.candidate_name}</h3>
                    <span className="badge bg-dark-700 text-dark-300 text-xs">
                      {typeLabels[app.app_type]?.label || app.app_type}
                    </span>
                    <span className={`badge ${statusColors[app.status] || 'bg-dark-700 text-dark-300'}`}>
                      {getStatusLabel(app.status, app.app_type)}
                    </span>
                    {app.direction && (
                      <span className={`badge text-xs ${app.direction === 'huntme' ? 'bg-violet-500/20 text-violet-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {app.direction === 'huntme' ? 'HuntMe' : 'Mason'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-dark-500 ml-8">
                    {app.candidate_phone && <span>{app.candidate_phone}</span>}
                    {app.candidate_telegram && <span>TG: {app.candidate_telegram}</span>}
                    <span>Скаут: {app.scout_name}</span>
                    {app.squad_name && <span>Сквад: {app.squad_name}</span>}
                    <span>{new Date(app.created_at).toLocaleDateString('ru')}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-dark-500" />
              </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
