const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, userHasRole } = require('../middleware/auth');

const router = express.Router();

// General agency stats
router.get('/general', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const { period } = req.query; // 'day', 'week', 'month', 'year', 'all'
    let dateFilter = '';
    if (period === 'day') dateFilter = "AND a.created_at >= datetime('now', '-1 day')";
    else if (period === 'week') dateFilter = "AND a.created_at >= datetime('now', '-7 days')";
    else if (period === 'month') dateFilter = "AND a.created_at >= datetime('now', '-1 month')";
    else if (period === 'year') dateFilter = "AND a.created_at >= datetime('now', '-1 year')";

    const totalApps = db.prepare(`SELECT COUNT(*) as count FROM applications a WHERE 1=1 ${dateFilter}`).get().count;
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM applications a WHERE 1=1 ${dateFilter} GROUP BY status
    `).all();
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
    const totalSquads = db.prepare('SELECT COUNT(*) as count FROM squads').get().count;
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;

    const registered = db.prepare(`
      SELECT COUNT(*) as count FROM applications a WHERE status = 'registering' ${dateFilter}
    `).get().count;
    const rejected = db.prepare(`
      SELECT COUNT(*) as count FROM applications a WHERE status = 'rejected' ${dateFilter}
    `).get().count;

    res.json({
      totalApplications: totalApps,
      byStatus,
      totalUsers,
      totalSquads,
      totalLeads,
      registered,
      rejected,
      conversionRate: totalApps > 0 ? ((registered / totalApps) * 100).toFixed(1) : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Stats by squad
router.get('/squads', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const stats = db.prepare(`
      SELECT s.id, s.name,
        COUNT(a.id) as total_apps,
        SUM(CASE WHEN a.status = 'registering' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM squads s
      LEFT JOIN applications a ON a.squad_id = s.id
      GROUP BY s.id
      ORDER BY total_apps DESC
    `).all();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Stats by user (top agents)
router.get('/top-agents', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const { period, limit = 20 } = req.query;
    let dateFilter = '';
    if (period === 'week') dateFilter = "AND a.created_at >= datetime('now', '-7 days')";
    else if (period === 'month') dateFilter = "AND a.created_at >= datetime('now', '-1 month')";

    const agents = db.prepare(`
      SELECT u.id, u.full_name, u.avatar, u.role,
        COUNT(a.id) as total_apps,
        SUM(CASE WHEN a.status = 'registering' THEN 1 ELSE 0 END) as registered,
        s.name as squad_name
      FROM users u
      LEFT JOIN applications a ON a.scout_id = u.id ${dateFilter}
      LEFT JOIN squads s ON u.squad_id = s.id
      WHERE u.role LIKE '%scout%' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY total_apps DESC
      LIMIT ?
    `).all(parseInt(limit));
    res.json(agents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Personal stats
router.get('/personal/:userId', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const userId = req.params.userId === 'me' ? req.user.id : parseInt(req.params.userId);

    const total = db.prepare('SELECT COUNT(*) as count FROM applications WHERE scout_id = ?').get(userId).count;
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM applications WHERE scout_id = ? GROUP BY status
    `).all(userId);
    const registered = db.prepare(
      "SELECT COUNT(*) as count FROM applications WHERE scout_id = ? AND status = 'registering'"
    ).get(userId).count;

    const thisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM applications
      WHERE scout_id = ? AND created_at >= datetime('now', '-1 month')
    `).get(userId).count;

    const thisWeek = db.prepare(`
      SELECT COUNT(*) as count FROM applications
      WHERE scout_id = ? AND created_at >= datetime('now', '-7 days')
    `).get(userId).count;

    res.json({ total, byStatus, registered, thisMonth, thisWeek });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// My team stats (for team_leader — their squad breakdown)
router.get('/my-team', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'team_leader') && !userHasRole(req.user, 'owner')) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  const db = getDb();
  try {
    const { period, squadId } = req.query;
    // owner can pass squadId, team_leader uses their own squad from DB
    let targetSquadId;
    if (userHasRole(req.user, 'owner') && squadId) {
      targetSquadId = parseInt(squadId);
    } else {
      const currentUser = db.prepare('SELECT squad_id FROM users WHERE id = ?').get(req.user.id);
      targetSquadId = currentUser?.squad_id;
    }
    if (!targetSquadId) return res.json({ squad: null, teams: [], scouts: [], summary: null });

    let dateFilter = '';
    if (period === 'day') dateFilter = "AND a.created_at >= datetime('now', '-1 day')";
    else if (period === 'week') dateFilter = "AND a.created_at >= datetime('now', '-7 days')";
    else if (period === 'month') dateFilter = "AND a.created_at >= datetime('now', '-1 month')";
    else if (period === 'year') dateFilter = "AND a.created_at >= datetime('now', '-1 year')";

    // Squad info
    const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(targetSquadId);

    // Teams in this squad with stats
    const teams = db.prepare(`
      SELECT t.id, t.name, t.leader_id,
        ul.full_name as leader_name,
        (SELECT COUNT(*) FROM users WHERE team_id = t.id AND is_active = 1) as member_count,
        COUNT(a.id) as total_apps,
        SUM(CASE WHEN a.status = 'registering' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM teams t
      LEFT JOIN users ul ON t.leader_id = ul.id
      LEFT JOIN users m ON m.team_id = t.id AND m.is_active = 1
      LEFT JOIN applications a ON a.scout_id = m.id ${dateFilter}
      WHERE t.squad_id = ?
      GROUP BY t.id
      ORDER BY total_apps DESC
    `).all(targetSquadId);

    // All scouts in this squad with their stats
    const scouts = db.prepare(`
      SELECT u.id, u.full_name, u.avatar, u.team_id,
        t.name as team_name,
        COUNT(a.id) as total_apps,
        SUM(CASE WHEN a.status = 'registering' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        MAX(a.created_at) as last_app_date
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN applications a ON a.scout_id = u.id ${dateFilter}
      WHERE u.squad_id = ? AND u.is_active = 1 AND u.role LIKE '%scout%'
      GROUP BY u.id
      ORDER BY total_apps DESC
    `).all(targetSquadId);

    // Squad summary
    const summary = db.prepare(`
      SELECT
        COUNT(a.id) as total_apps,
        SUM(CASE WHEN a.status = 'registering' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COUNT(DISTINCT a.scout_id) as active_scouts
      FROM applications a
      JOIN users u ON a.scout_id = u.id
      WHERE u.squad_id = ? ${dateFilter}
    `).get(targetSquadId);

    res.json({ squad, teams, scouts, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Logs (owner only)
router.get('/logs', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'owner', 'team_leader')) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  const db = getDb();
  try {
    const logs = db.prepare(`
      SELECT l.*, u.full_name as user_name
      FROM logs l LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `).all();
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
