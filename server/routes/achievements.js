const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Achievement definitions — computed from real data, no separate table needed
const ACHIEVEMENTS = [
  // Applications milestones
  { id: 'first_app', name: 'Первые шаги', description: 'Подать первую анкету', icon: '🚀', category: 'applications', threshold: 1, stat: 'total_apps' },
  { id: 'apps_10', name: 'Активный скаут', description: 'Подать 10 анкет', icon: '⚡', category: 'applications', threshold: 10, stat: 'total_apps' },
  { id: 'apps_25', name: 'Профессионал', description: 'Подать 25 анкет', icon: '💎', category: 'applications', threshold: 25, stat: 'total_apps' },
  { id: 'apps_50', name: 'Легенда', description: 'Подать 50 анкет', icon: '🏆', category: 'applications', threshold: 50, stat: 'total_apps' },
  { id: 'apps_100', name: 'Мастер', description: 'Подать 100 анкет', icon: '👑', category: 'applications', threshold: 100, stat: 'total_apps' },
  // Registration milestones
  { id: 'first_reg', name: 'Первая регистрация', description: 'Первая успешная регистрация', icon: '✅', category: 'registrations', threshold: 1, stat: 'registrations' },
  { id: 'regs_5', name: 'Рекрутер', description: '5 успешных регистраций', icon: '🎯', category: 'registrations', threshold: 5, stat: 'registrations' },
  { id: 'regs_15', name: 'Золотой рекрутер', description: '15 успешных регистраций', icon: '🥇', category: 'registrations', threshold: 15, stat: 'registrations' },
  { id: 'regs_30', name: 'Элита', description: '30 успешных регистраций', icon: '💫', category: 'registrations', threshold: 30, stat: 'registrations' },
  // Leads milestones
  { id: 'leads_10', name: 'Лидовод', description: 'Обработать 10 лидов', icon: '📞', category: 'leads', threshold: 10, stat: 'leads_processed' },
  { id: 'leads_50', name: 'Лидоман', description: 'Обработать 50 лидов', icon: '📊', category: 'leads', threshold: 50, stat: 'leads_processed' },
  { id: 'leads_100', name: 'Лид-машина', description: 'Обработать 100 лидов', icon: '🔥', category: 'leads', threshold: 100, stat: 'leads_processed' },
  // Time-based
  { id: 'week_5', name: 'Недельный марафон', description: '5+ анкет за неделю', icon: '🏃', category: 'streaks', threshold: 5, stat: 'apps_this_week' },
  { id: 'month_20', name: 'Месячный рекорд', description: '20+ анкет за месяц', icon: '📅', category: 'streaks', threshold: 20, stat: 'apps_this_month' },
  { id: 'week_10', name: 'Спринтер', description: '10+ анкет за неделю', icon: '⚡', category: 'streaks', threshold: 10, stat: 'apps_this_week' },
];

function getUserStats(db, userId) {
  const total_apps = db.prepare(
    'SELECT COUNT(*) as c FROM applications WHERE scout_id = ?'
  ).get(userId)?.c || 0;

  const registrations = db.prepare(
    "SELECT COUNT(*) as c FROM applications WHERE scout_id = ? AND status = 'registration'"
  ).get(userId)?.c || 0;

  const leads_processed = db.prepare(
    "SELECT COUNT(*) as c FROM leads WHERE scout_id = ? AND status != 'new'"
  ).get(userId)?.c || 0;

  const apps_this_week = db.prepare(
    "SELECT COUNT(*) as c FROM applications WHERE scout_id = ? AND created_at >= datetime('now', '-7 days')"
  ).get(userId)?.c || 0;

  const apps_this_month = db.prepare(
    "SELECT COUNT(*) as c FROM applications WHERE scout_id = ? AND created_at >= datetime('now', '-1 month')"
  ).get(userId)?.c || 0;

  return { total_apps, registrations, leads_processed, apps_this_week, apps_this_month };
}

// Get achievements for current user or specific user
router.get('/:userId?', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const targetId = req.params.userId === 'me' || !req.params.userId
      ? req.user.id
      : parseInt(req.params.userId);

    if (isNaN(targetId)) return res.status(400).json({ error: 'Некорректный ID' });

    const stats = getUserStats(db, targetId);

    const achievements = ACHIEVEMENTS.map(a => {
      const current = stats[a.stat] || 0;
      const unlocked = current >= a.threshold;
      const progress = Math.min(current / a.threshold, 1);
      return {
        ...a,
        current,
        unlocked,
        progress: Math.round(progress * 100),
      };
    });

    const unlocked = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;

    res.json({ achievements, stats, unlocked, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Leaderboard — top users by achievements
router.get('/leaderboard/top', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const users = db.prepare(
      "SELECT id, full_name, avatar, role FROM users WHERE is_active = 1 AND role LIKE '%scout%'"
    ).all();

    const leaderboard = users.map(u => {
      const stats = getUserStats(db, u.id);
      const unlocked = ACHIEVEMENTS.filter(a => (stats[a.stat] || 0) >= a.threshold).length;
      return { ...u, unlocked, total_apps: stats.total_apps, registrations: stats.registrations };
    }).sort((a, b) => b.unlocked - a.unlocked || b.total_apps - a.total_apps)
      .slice(0, 20);

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
