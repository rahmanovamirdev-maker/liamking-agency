import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { User, Shield, Wallet, BarChart3, Lock } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const roleLabels: Record<string, string> = {
  owner: 'Владелец', team_leader: 'Сквад Лидер', admin: 'Админ', curator: 'Куратор', hr: 'HR Менеджер', hr_huntme: 'HR HuntMe', hr_mason: 'HR Mason', scout: 'Скаут',
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ full_name: '', about: '', wallet: '' });
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '' });
  const [stats, setStats] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name, about: user.about || '', wallet: user.wallet || '' });
      api.get<any>('/stats/personal/me').then(setStats).catch(() => {});
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${user?.id}`, form);
      await refreshUser();
      toast.success('Профиль обновлён');
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.put('/auth/change-password', passForm);
      toast.success('Пароль изменён');
      setPassForm({ oldPassword: '', newPassword: '' });
    } catch (err: any) { toast.error(err.message); }
  }

  if (!user) return null;

  return (
    <motion.div className="space-y-6 max-w-3xl" initial="hidden" animate="visible" variants={stagger}>
      <motion.h1 variants={fadeUp} className="text-2xl font-bold text-white">Профиль</motion.h1>

      {/* User card */}
      <motion.div variants={fadeUp} className="card flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-3xl font-black text-white">
          {user.full_name.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user.full_name}</h2>
          <p className="text-primary-400 flex items-center gap-1"><Shield size={14} /> {user.roles.map(r => roleLabels[r] || r).join(', ')}</p>
          {user.squad_name && <p className="text-sm text-dark-400 mt-1">Сквад: {user.squad_name}</p>}
          {user.team_name && <p className="text-sm text-dark-400">Команда: {user.team_name}</p>}
          <p className="text-xs text-dark-500 mt-1">@{user.username} • На платформе с {new Date(user.created_at).toLocaleDateString('ru')}</p>
        </div>
      </motion.div>

      {/* Personal stats */}
      {stats && (
        <motion.div variants={fadeUp} className="card">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><BarChart3 size={18} /> Моя статистика</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Всего анкет" value={stats.total} />
            <MiniStat label="Зарегистрировано" value={stats.registered} />
            <MiniStat label="За неделю" value={stats.thisWeek} />
            <MiniStat label="За месяц" value={stats.thisMonth} />
          </div>
        </motion.div>
      )}

      {/* Edit profile */}
      <motion.form variants={fadeUp} onSubmit={saveProfile} className="card space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><User size={18} /> Редактировать профиль</h3>
        <div>
          <label className="block text-sm text-dark-300 mb-1">ФИО</label>
          <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
            className="input-field" required />
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1">О себе</label>
          <textarea value={form.about} onChange={e => setForm({ ...form, about: e.target.value })}
            className="input-field" rows={3} placeholder="Расскажите о себе..." />
        </div>
        <div>
          <label className="text-sm text-dark-300 mb-1 flex items-center gap-1"><Wallet size={14} /> Кошелёк для выплат (TRC20)</label>
          <input value={form.wallet} onChange={e => setForm({ ...form, wallet: e.target.value })}
            className="input-field" placeholder="Номер карты / кошелька" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </motion.form>

      {/* Change password */}
      <motion.form variants={fadeUp} onSubmit={changePassword} className="card space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><Lock size={18} /> Сменить пароль</h3>
        <div>
          <label className="block text-sm text-dark-300 mb-1">Текущий пароль</label>
          <input value={passForm.oldPassword} onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })}
            className="input-field" type="password" required />
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1">Новый пароль</label>
          <input value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
            className="input-field" type="password" required minLength={6} />
        </div>
        <button type="submit" className="btn-primary">Сменить пароль</button>
      </motion.form>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-dark-800 rounded-lg p-3 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-dark-400">{label}</p>
    </div>
  );
}
