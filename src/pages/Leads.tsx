import { useState, useEffect } from 'react';
import { useAuth, hasRole } from '../contexts/AuthContext';
import { api } from '../api/client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Database, Plus, Search, Phone, Upload, Users, Send, Check, X, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const leadStatusLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'bg-blue-500/20 text-blue-400' },
  in_progress: { label: 'В работе', color: 'bg-yellow-500/20 text-yellow-400' },
  contacted: { label: 'Связался', color: 'bg-purple-500/20 text-purple-400' },
  refused: { label: 'Отказалась', color: 'bg-red-500/20 text-red-400' },
  ignored: { label: 'Игнор', color: 'bg-orange-500/20 text-orange-400' },
  processed: { label: 'Обработана', color: 'bg-emerald-500/20 text-emerald-400' },
};

const requestStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: 'Одобрена', color: 'bg-emerald-500/20 text-emerald-400' },
  rejected: { label: 'Отклонена', color: 'bg-red-500/20 text-red-400' },
};

export default function Leads() {
  const { user } = useAuth();

  if (hasRole(user, 'owner')) return <OwnerLeads />;
  if (hasRole(user, 'team_leader')) return <AdminLeads />;
  if (hasRole(user, 'scout') || hasRole(user, 'admin')) return <ScoutLeads />;
  return <div className="text-dark-400">Нет доступа</div>;
}

// ======================== OWNER VIEW ========================
function OwnerLeads() {
  const [tab, setTab] = useState<'pool' | 'touch1' | 'touch2' | 'touch3' | 'touch4' | 'trash' | 'upload' | 'all'>('pool');
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', telegram: '', source: '' });
  const [uploadText, setUploadText] = useState('');
  const [poolCount, setPoolCount] = useState(0);
  const [touchStats, setTouchStats] = useState<any>({ touch_0: 0, touch_1: 0, touch_2: 0, touch_3: 0, touch_4: 0, trash: 0 });

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    try {
      const params = new URLSearchParams();
      if (tab === 'pool') params.set('pool', '1');
      else if (tab === 'touch1') params.set('touch', '1');
      else if (tab === 'touch2') params.set('touch', '2');
      else if (tab === 'touch3') params.set('touch', '3');
      else if (tab === 'touch4') params.set('touch', '4');
      else if (tab === 'trash') params.set('touch', 'trash');
      if (search) params.set('search', search);
      const [data, pc, ts] = await Promise.all([
        api.get<any[]>(`/leads?${params}`),
        api.get<any>('/leads/pool-count'),
        api.get<any>('/leads/touch-stats'),
      ]);
      setLeads(data);
      setPoolCount(pc.count);
      setTouchStats(ts);
    } catch { /* ignore */ }
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/leads', form);
      toast.success('Лид добавлен');
      setShowForm(false);
      setForm({ name: '', phone: '', telegram: '', source: '' });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleUpload() {
    if (!uploadText.trim()) return;
    try {
      const lines = uploadText.split('\n').filter(l => l.trim());
      const result = await api.post<any>('/leads/upload', { lines });
      toast.success(result.message);
      setUploadText('');
      setTab('pool');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  const touchColor = (n: number) => {
    if (n === 0) return 'text-blue-400';
    if (n === 1) return 'text-yellow-400';
    if (n === 2) return 'text-orange-400';
    if (n === 3) return 'text-red-400';
    return 'text-red-500';
  };

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="text-primary-400" size={28} />
          <h1 className="text-2xl font-bold text-white">Общая БД Лидов</h1>
          <span className="badge bg-primary-500/20 text-primary-400">{poolCount} в пуле</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Добавить лид
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-700 pb-2 overflow-x-auto">
        {([
          { key: 'pool' as const, label: `Пул (${poolCount})` },
          { key: 'touch1' as const, label: `Касание 1 (${touchStats.touch_1})` },
          { key: 'touch2' as const, label: `Касание 2 (${touchStats.touch_2})` },
          { key: 'touch3' as const, label: `Касание 3 (${touchStats.touch_3})` },
          { key: 'touch4' as const, label: `Касание 4 (${touchStats.touch_4})` },
          { key: 'trash' as const, label: `Мусор (${touchStats.trash})` },
          { key: 'upload' as const, label: 'Загрузить' },
          { key: 'all' as const, label: 'Все' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-t-lg text-sm font-medium transition whitespace-nowrap ${
              tab === t.key ? 'bg-dark-800 text-primary-400 border border-dark-700 border-b-dark-900' : 'text-dark-400 hover:text-white'
            } ${t.key === 'trash' ? 'text-red-400' : ''}`}>{t.label}</button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === 'upload' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2"><Upload size={18} /> Загрузка лидов</h3>
          <p className="text-sm text-dark-400">Формат: Имя, Телефон, Телеграм, Источник (по одному на строку, разделитель: запятая, точка с запятой или табуляция)</p>
          <textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
            className="input-field font-mono text-sm" rows={10}
            placeholder="Анна Иванова, +79001234567, @anna_iv, Instagram&#10;Мария Петрова, +79007654321, @maria_p, Telegram&#10;..." />
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">{uploadText.split('\n').filter(l => l.trim()).length} строк</span>
            <button onClick={handleUpload} className="btn-primary flex items-center gap-2">
              <Upload size={16} /> Загрузить
            </button>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && tab !== 'upload' && (
        <form onSubmit={createLead} className="card space-y-4">
          <h3 className="font-semibold text-white">Новый лид</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Имя" required />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="input-field" placeholder="Телефон" />
            <input value={form.telegram} onChange={e => setForm({ ...form, telegram: e.target.value })}
              className="input-field" placeholder="Телеграм юзер (@...)" />
            <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
              className="input-field" placeholder="Источник" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Добавить</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Отмена</button>
          </div>
        </form>
      )}

      {/* Search */}
      {tab !== 'upload' && (
        <form onSubmit={e => { e.preventDefault(); loadData(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9" placeholder="Поиск по имени, телефону, телеграму..." />
          </div>
          <button type="submit" className="btn-secondary">Найти</button>
        </form>
      )}

      {/* Leads list */}
      {tab !== 'upload' && (
        <div className="space-y-2">
          <div className="text-sm text-dark-400 mb-2">Найдено: {leads.length}</div>
          {leads.length === 0 ? (
            <div className="card text-center text-dark-400 py-10">
              {tab === 'trash' ? (
                <div className="flex flex-col items-center gap-2">
                  <Trash2 size={32} className="text-dark-600" />
                  <p>Мусорка пуста</p>
                </div>
              ) : 'Нет лидов'}
            </div>
          ) : (
            leads.map(lead => (
              <div key={lead.id} className={`card py-3 px-4 ${tab === 'trash' ? 'border-l-2 border-red-500/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{lead.name}</p>
                      {lead.touch_count > 0 && (
                        <span className={`text-xs font-medium ${touchColor(lead.touch_count)}`}>
                          {lead.touch_count > 4 ? `${lead.touch_count} касаний` : `касание ${lead.touch_count}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                      {lead.phone && <span className="flex items-center gap-1"><Phone size={10} /> {lead.phone}</span>}
                      {lead.telegram && <span>TG: {lead.telegram}</span>}
                      {lead.source && <span>Источник: {lead.source}</span>}
                      {lead.scout_name && <span>Скаут: {lead.scout_name}</span>}
                    </div>
                  </div>
                  <span className={`badge ${leadStatusLabels[lead.status]?.color}`}>
                    {leadStatusLabels[lead.status]?.label}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}

// ======================== SCOUT VIEW ========================
function ScoutLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const [leadsData, reqData] = await Promise.all([
        api.get<any[]>(`/leads${params}`),
        api.get<any[]>('/leads/requests'),
      ]);
      setLeads(leadsData);
      setRequests(reqData);
    } catch { /* ignore */ }
  }

  async function requestLeads() {
    setRequesting(true);
    try {
      await api.post('/leads/requests', {});
      toast.success('Заявка на лиды отправлена!');
      loadData();
    } catch (err: any) { toast.error(err.message); }
    setRequesting(false);
  }

  async function updateStatus(leadId: number, status: string) {
    try {
      await api.put(`/leads/${leadId}`, { status });
      toast.success('Статус обновлён');
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  const hasPending = requests.some(r => r.status === 'pending');

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="text-primary-400" size={28} />
          <h1 className="text-2xl font-bold text-white">Мои лиды</h1>
          <span className="badge bg-primary-500/20 text-primary-400">{leads.length}</span>
        </div>
        <button onClick={requestLeads} disabled={requesting || hasPending}
          className={`flex items-center gap-2 ${hasPending ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}`}>
          <Send size={16} /> {hasPending ? 'Заявка отправлена' : 'Запросить лиды'}
        </button>
      </motion.div>

      {/* Requests history */}
      {requests.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Мои заявки на лиды</h3>
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 bg-dark-800 rounded text-sm">
                <div>
                  <span className={`badge mr-2 ${requestStatusLabels[r.status]?.color}`}>
                    {requestStatusLabels[r.status]?.label}
                  </span>
                  <span className="text-dark-400">{new Date(r.created_at).toLocaleDateString('ru')}</span>
                  {r.approved_count && <span className="text-emerald-400 ml-2">+{r.approved_count} лидов</span>}
                  {r.comment && <span className="text-dark-500 ml-2">— {r.comment}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); loadData(); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9" placeholder="Поиск..." />
        </div>
        <button type="submit" className="btn-secondary">Найти</button>
      </form>

      {/* Leads */}
      {leads.length === 0 ? (
        <div className="card text-center text-dark-400 py-10">
          <p>У вас пока нет лидов</p>
          <p className="text-sm mt-1">Нажмите "Запросить лиды", чтобы получить новых</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <div key={lead.id} className="card py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">{lead.name}</p>
                  <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                    {lead.phone && <span><Phone size={10} className="inline mr-1" />{lead.phone}</span>}
                    {lead.telegram && <span>TG: {lead.telegram}</span>}
                    {lead.source && <span>Источник: {lead.source}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                    className="input-field w-auto text-sm py-1">
                    {Object.entries(leadStatusLabels)
                      .filter(([k]) => k !== 'new') // scout can't set to new
                      .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ======================== ADMIN VIEW ========================
function AdminLeads() {
  const [tab, setTab] = useState<'requests' | 'scouts'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [scouts, setScouts] = useState<any[]>([]);
  const [selectedScout, setSelectedScout] = useState<any>(null);
  const [scoutLeads, setScoutLeads] = useState<any[]>([]);
  const [scoutStats, setScoutStats] = useState<any>(null);
  const [approveForm, setApproveForm] = useState<{ id: number; count: string; comment: string } | null>(null);
  const [poolCount, setPoolCount] = useState(0);

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    try {
      const [reqData, scoutsData, pc] = await Promise.all([
        api.get<any[]>('/leads/requests'),
        api.get<any[]>('/leads/scouts'),
        api.get<any>('/leads/pool-count'),
      ]);
      setRequests(reqData);
      setScouts(scoutsData);
      setPoolCount(pc.count);
    } catch { /* ignore */ }
  }

  async function handleApprove(requestId: number) {
    if (!approveForm || !approveForm.count) {
      toast.error('Укажите количество лидов');
      return;
    }
    try {
      const result = await api.put<any>(`/leads/requests/${requestId}`, {
        action: 'approve',
        count: parseInt(approveForm.count),
        comment: approveForm.comment,
      });
      toast.success(result.message);
      setApproveForm(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleReject(requestId: number) {
    try {
      await api.put(`/leads/requests/${requestId}`, { action: 'reject', comment: 'Отклонено' });
      toast.success('Заявка отклонена');
      setApproveForm(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function loadScoutDetail(scoutId: number) {
    try {
      const data = await api.get<any>(`/leads/scouts/${scoutId}`);
      setSelectedScout(data.scout);
      setScoutLeads(data.leads);
      setScoutStats(data.stats);
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="text-primary-400" size={28} />
          <h1 className="text-2xl font-bold text-white">БД Лидов</h1>
          <span className="badge bg-primary-500/20 text-primary-400">{poolCount} в пуле</span>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-2">
        {[
          { key: 'requests' as const, label: `Заявки (${requests.filter(r => r.status === 'pending').length})` },
          { key: 'scouts' as const, label: 'Мои скауты' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedScout(null); }}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-dark-800 text-primary-400 border border-dark-700 border-b-dark-900' : 'text-dark-400 hover:text-white'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Requests tab */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="card text-center text-dark-400 py-10">Нет заявок</div>
          ) : (
            requests.map(r => (
              <div key={r.id} className="card py-4 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{r.scout_name}</p>
                    <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                      <span>{new Date(r.created_at).toLocaleString('ru')}</span>
                      <span className={`badge ${requestStatusLabels[r.status]?.color}`}>
                        {requestStatusLabels[r.status]?.label}
                      </span>
                      {r.approved_count && <span className="text-emerald-400">Выдано: {r.approved_count}</span>}
                      {r.comment && <span className="text-dark-400">— {r.comment}</span>}
                    </div>
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      {approveForm?.id === r.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" min="1" max={poolCount}
                            value={approveForm!.count}
                            onChange={e => setApproveForm({ ...approveForm!, count: e.target.value })}
                            className="input-field w-20 text-sm py-1"
                            placeholder="Кол-во" />
                          <input value={approveForm!.comment}
                            onChange={e => setApproveForm({ ...approveForm!, comment: e.target.value })}
                            className="input-field w-40 text-sm py-1" placeholder="Комментарий" />
                          <button onClick={() => handleApprove(r.id)} className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white transition">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setApproveForm(null)} className="p-2 bg-dark-700 hover:bg-dark-600 rounded text-dark-300 transition">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setApproveForm({ id: r.id, count: '', comment: '' })}
                            className="btn-primary text-sm py-1 px-3 flex items-center gap-1">
                            <Check size={14} /> Одобрить
                          </button>
                          <button onClick={() => handleReject(r.id)}
                            className="btn-danger text-sm py-1 px-3 flex items-center gap-1">
                            <X size={14} /> Отклонить
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Scouts tab */}
      {tab === 'scouts' && !selectedScout && (
        <div className="space-y-2">
          {scouts.length === 0 ? (
            <div className="card text-center text-dark-400 py-10">Нет скаутов</div>
          ) : (
            scouts.map(s => (
              <div key={s.id} onClick={() => loadScoutDetail(s.id)}
                className="card py-4 px-5 cursor-pointer hover:border-dark-500 transition flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{s.full_name}</p>
                  <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                    <span>Всего: {s.total_leads}</span>
                    <span className="text-yellow-400">В работе: {s.in_progress}</span>
                    <span className="text-purple-400">Связался: {s.contacted}</span>
                    <span className="text-emerald-400">Обработано: {s.processed}</span>
                    <span className="text-red-400">Отказ: {s.refused}</span>
                    <span className="text-orange-400">Игнор: {s.ignored}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-dark-500" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Scout detail */}
      {tab === 'scouts' && selectedScout && (
        <div className="space-y-4">
          <button onClick={() => { setSelectedScout(null); setScoutLeads([]); setScoutStats(null); }}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition">
            <ArrowLeft size={18} /> Назад к списку
          </button>

          <h2 className="text-xl font-bold text-white">{selectedScout.full_name}</h2>

          {/* Stats cards */}
          {scoutStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Всего', val: scoutStats.total, color: 'text-white' },
                { label: 'В работе', val: scoutStats.in_progress, color: 'text-yellow-400' },
                { label: 'Связался', val: scoutStats.contacted, color: 'text-purple-400' },
                { label: 'Обработано', val: scoutStats.processed, color: 'text-emerald-400' },
                { label: 'Отказ', val: scoutStats.refused, color: 'text-red-400' },
                { label: 'Игнор', val: scoutStats.ignored, color: 'text-orange-400' },
              ].map(s => (
                <div key={s.label} className="card py-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-dark-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Scout's leads */}
          <div className="space-y-2">
            {scoutLeads.length === 0 ? (
              <div className="card text-center text-dark-400 py-6">Нет выданных лидов</div>
            ) : (
              scoutLeads.map(lead => (
                <div key={lead.id} className="card py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{lead.name}</p>
                      <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                        {lead.phone && <span><Phone size={10} className="inline mr-1" />{lead.phone}</span>}
                        {lead.telegram && <span>TG: {lead.telegram}</span>}
                        {lead.assigned_at && <span>Выдан: {new Date(lead.assigned_at).toLocaleDateString('ru')}</span>}
                      </div>
                    </div>
                    <span className={`badge ${leadStatusLabels[lead.status]?.color}`}>
                      {leadStatusLabels[lead.status]?.label}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
