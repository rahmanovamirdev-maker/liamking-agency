import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Lock, Star, Flame, Target, Award } from 'lucide-react';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  current: number;
  unlocked: boolean;
  progress: number;
}

interface AchievementsData {
  achievements: Achievement[];
  stats: Record<string, number>;
  unlocked: number;
  total: number;
}

interface LeaderboardUser {
  id: number;
  full_name: string;
  avatar: string | null;
  unlocked: number;
  total_apps: number;
  registrations: number;
}

const categoryLabels: Record<string, string> = {
  applications: 'Анкеты',
  registrations: 'Регистрации',
  leads: 'Лиды',
  streaks: 'Активность',
};

const categoryIcons: Record<string, typeof Trophy> = {
  applications: Target,
  registrations: Star,
  leads: Flame,
  streaks: Award,
};

export default function Achievements() {
  const { user } = useAuth();
  const [data, setData] = useState<AchievementsData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [tab, setTab] = useState<'my' | 'leaderboard'>('my');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [achievementsData, lb] = await Promise.all([
        api.get<AchievementsData>('/achievements/me'),
        api.get<LeaderboardUser[]>('/achievements/leaderboard/top'),
      ]);
      setData(achievementsData);
      setLeaderboard(lb);
    } catch { /* ignore */ }
  }

  const categories = data
    ? [...new Set(data.achievements.map(a => a.category))]
    : [];

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Достижения</h1>
          {data && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
              {data.unlocked}/{data.total}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'my' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            Мои достижения
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'leaderboard' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            Таблица лидеров
          </button>
        </div>
      </div>

      {/* Overall progress */}
      {data && tab === 'my' && (
        <motion.div variants={fadeUp} className="card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/30">
              <Trophy size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-white">
                Разблокировано {data.unlocked} из {data.total}
              </p>
              <div className="w-full bg-dark-700 rounded-full h-3 mt-2">
                <motion.div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.unlocked / data.total) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Всего анкет" value={data.stats.total_apps} />
            <MiniStat label="Регистрации" value={data.stats.registrations} />
            <MiniStat label="Обраб. лидов" value={data.stats.leads_processed} />
            <MiniStat label="Анкет за неделю" value={data.stats.apps_this_week} />
          </div>
        </motion.div>
      )}

      {/* Achievements by category */}
      {tab === 'my' && categories.map(cat => {
        const catAchievements = data!.achievements.filter(a => a.category === cat);
        const CatIcon = categoryIcons[cat] || Trophy;
        return (
          <motion.div key={cat} variants={fadeUp} className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CatIcon size={20} className="text-primary-400" />
              {categoryLabels[cat] || cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {catAchievements.map(a => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <motion.div variants={fadeUp} className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" />
            Таблица лидеров
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-dark-400 text-center py-8">Пока нет данных</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((u, i) => (
                <div key={u.id} className={`flex items-center gap-4 p-3 rounded-lg ${
                  u.id === user?.id ? 'bg-primary-600/10 border border-primary-600/30' : 'bg-dark-800'
                }`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-dark-700 text-dark-400'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {u.avatar
                      ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                      : u.full_name.charAt(0)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {u.full_name}
                      {u.id === user?.id && <span className="text-primary-400 text-xs ml-2">(Вы)</span>}
                    </p>
                    <p className="text-xs text-dark-500">
                      {u.unlocked} достижений • {u.total_apps} анкет • {u.registrations} рег.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Trophy size={16} />
                    <span className="font-bold">{u.unlocked}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function AchievementCard({ achievement: a }: { achievement: Achievement }) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
      a.unlocked
        ? 'bg-dark-800 border-amber-500/30 shadow-md shadow-amber-500/5'
        : 'bg-dark-800/50 border-dark-700 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`text-3xl w-12 h-12 flex items-center justify-center rounded-lg ${
          a.unlocked ? 'bg-amber-500/20' : 'bg-dark-700'
        }`}>
          {a.unlocked ? a.icon : <Lock size={20} className="text-dark-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${a.unlocked ? 'text-white' : 'text-dark-400'}`}>
            {a.name}
          </p>
          <p className="text-xs text-dark-500 mt-0.5">{a.description}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-dark-400">{a.current}/{a.threshold}</span>
          <span className={a.unlocked ? 'text-amber-400 font-medium' : 'text-dark-500'}>
            {a.progress}%
          </span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-2">
          <motion.div
            className={`h-2 rounded-full ${
              a.unlocked
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-dark-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${a.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-dark-800 rounded-lg p-3 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-dark-400 mt-1">{label}</p>
    </div>
  );
}
