const express = require('express');
const { getDb, saveDatabase } = require('../database');
const { authMiddleware, roleMiddleware, userHasRole } = require('../middleware/auth');

const router = express.Router();

// ===================== LEADS (общая БД) =====================

// Get leads — owner sees all, admin sees unassigned + his scouts' leads, scout sees only own
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const { status, search, scout_id, pool, touch } = req.query;
    let query = `
      SELECT l.*, u.full_name as scout_name
      FROM leads l
      LEFT JOIN users u ON l.scout_id = u.id
    `;
    const conditions = [];
    const params = [];

    if (userHasRole(req.user, 'scout') && !userHasRole(req.user, 'owner', 'team_leader')) {
      conditions.push('l.scout_id = ?');
      params.push(req.user.id);
    } else if (pool === '1') {
      // Show only unassigned pool
      conditions.push("l.status = 'new' AND l.scout_id IS NULL");
    } else if (scout_id) {
      const sid = parseInt(scout_id);
      if (!isNaN(sid)) {
        conditions.push('l.scout_id = ?');
        params.push(sid);
      }
    }

    // Filter by touch count
    if (touch === 'trash') {
      conditions.push('l.touch_count > 4');
    } else if (touch) {
      const t = parseInt(touch);
      if (!isNaN(t)) {
        conditions.push('l.touch_count = ?');
        params.push(t);
      }
    }

    if (status) { conditions.push('l.status = ?'); params.push(status); }
    if (search) {
      conditions.push('(l.name LIKE ? OR l.phone LIKE ? OR l.telegram LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY l.created_at DESC';

    const leads = db.prepare(query).all(...params);
    res.json(leads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get unassigned leads count (for owner/admin)
router.get('/pool-count', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const { count } = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'new' AND scout_id IS NULL").get();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get touch counts summary (for owner)
router.get('/touch-stats', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const stats = {
      touch_0: db.prepare("SELECT COUNT(*) as count FROM leads WHERE touch_count = 0").get().count,
      touch_1: db.prepare("SELECT COUNT(*) as count FROM leads WHERE touch_count = 1").get().count,
      touch_2: db.prepare("SELECT COUNT(*) as count FROM leads WHERE touch_count = 2").get().count,
      touch_3: db.prepare("SELECT COUNT(*) as count FROM leads WHERE touch_count = 3").get().count,
      touch_4: db.prepare("SELECT COUNT(*) as count FROM leads WHERE touch_count = 4").get().count,
      trash: db.prepare("SELECT COUNT(*) as count FROM leads WHERE touch_count > 4").get().count,
    };
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get touch history for a lead
router.get('/:id/touches', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const touches = db.prepare(`
      SELECT lt.*, u.full_name as user_name
      FROM lead_touches lt
      LEFT JOIN users u ON lt.user_id = u.id
      WHERE lt.lead_id = ?
      ORDER BY lt.created_at ASC
    `).all(req.params.id);
    res.json(touches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Upload leads from CSV/TXT (owner only)
router.post('/upload', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const { lines } = req.body; // array of strings like "Name,Phone,Telegram,Source"
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Нет данных для загрузки' });
  }

  const db = getDb();
  try {
    let imported = 0;
    let skipped = 0;

    for (const line of lines) {
      if (typeof line !== 'string') { skipped++; continue; }
      const trimmed = line.trim();
      if (!trimmed) { skipped++; continue; }

      // Parse CSV: name, phone, telegram, source
      const parts = trimmed.split(/[,;\t]/).map(p => p.trim());
      const name = parts[0] || '';
      const phone = parts[1] || '';
      const telegram = parts[2] || '';
      const source = parts[3] || '';

      if (!name) { skipped++; continue; }

      db.prepare(`
        INSERT INTO leads (name, phone, telegram, source, status)
        VALUES (?, ?, ?, ?, 'new')
      `).run(name, phone, telegram, source);
      imported++;
    }

    saveDatabase();
    res.json({ imported, skipped, message: `Загружено ${imported} лидов` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create single lead (owner only)
router.post('/', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const { name, phone, telegram, source } = req.body;
  if (!name) return res.status(400).json({ error: 'Введите имя лида' });

  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO leads (name, phone, telegram, source, status)
      VALUES (?, ?, ?, ?, 'new')
    `).run(name, phone || '', telegram || '', source || '');
    saveDatabase();
    res.status(201).json({ id: result.lastInsertRowid, message: 'Лид добавлен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update lead status (scout updates their own leads)
router.put('/:id', authMiddleware, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Укажите статус' });

  const validStatuses = ['in_progress', 'contacted', 'refused', 'ignored', 'processed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  const db = getDb();
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Лид не найден' });

    // Scout can only update own leads
    if (userHasRole(req.user, 'scout') && !userHasRole(req.user, 'owner', 'team_leader') && lead.scout_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    // If refused or ignored — record touch and return to pool
    if (status === 'refused' || status === 'ignored') {
      const newTouchCount = (lead.touch_count || 0) + 1;

      // Record touch in lead_touches
      db.prepare(`
        INSERT INTO lead_touches (lead_id, user_id, touch_type, comment)
        VALUES (?, ?, ?, ?)
      `).run(lead.id, req.user.id, status, `Касание ${newTouchCount}: ${status === 'refused' ? 'Отказалась' : 'Игнор'}`);

      // Increment touch_count, unassign lead, return to pool
      db.prepare(`
        UPDATE leads SET touch_count = ?, status = 'new', scout_id = NULL, assigned_at = NULL WHERE id = ?
      `).run(newTouchCount, lead.id);

      saveDatabase();
      return res.json({ message: `Касание ${newTouchCount} записано, лид возвращён в пул` });
    }

    db.prepare('UPDATE leads SET status = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    saveDatabase();
    res.json({ message: 'Статус обновлён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===================== LEAD REQUESTS =====================

// Get lead requests
router.get('/requests', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    let query = `
      SELECT lr.*, 
        s.full_name as scout_name,
        a.full_name as admin_name
      FROM lead_requests lr
      LEFT JOIN users s ON lr.scout_id = s.id
      LEFT JOIN users a ON lr.admin_id = a.id
    `;
    const conditions = [];
    const params = [];

    if (userHasRole(req.user, 'scout') && !userHasRole(req.user, 'owner', 'team_leader')) {
      conditions.push('lr.scout_id = ?');
      params.push(req.user.id);
    } else if (userHasRole(req.user, 'team_leader') && !userHasRole(req.user, 'owner')) {
      conditions.push('lr.admin_id = ?');
      params.push(req.user.id);
    }

    const { status: reqStatus } = req.query;
    if (reqStatus) { conditions.push('lr.status = ?'); params.push(reqStatus); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY lr.created_at DESC';

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Scout creates a lead request
router.post('/requests', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'scout')) {
    return res.status(403).json({ error: 'Только скауты могут запрашивать лиды' });
  }

  const db = getDb();
  try {
    // Find scout's team leader (admin)
    const scout = db.prepare(`
      SELECT u.team_id, t.squad_id, s.admin_id
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN squads s ON t.squad_id = s.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!scout?.admin_id) {
      return res.status(400).json({ error: 'У вас нет назначенного лидера команды' });
    }

    // Check if there's already a pending request
    const pending = db.prepare(
      "SELECT id FROM lead_requests WHERE scout_id = ? AND status = 'pending'"
    ).get(req.user.id);
    if (pending) {
      return res.status(400).json({ error: 'У вас уже есть активная заявка на лиды' });
    }

    const result = db.prepare(`
      INSERT INTO lead_requests (scout_id, admin_id, status) VALUES (?, ?, 'pending')
    `).run(req.user.id, scout.admin_id);

    // Notify admin
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, 'lead_request', 'Запрос лидов', ?)
    `).run(scout.admin_id, `Скаут ${req.user.full_name} запросил лиды`);

    saveDatabase();
    res.status(201).json({ id: result.lastInsertRowid, message: 'Заявка создана' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Admin resolves a lead request (approve/reject)
router.put('/requests/:id', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'team_leader', 'owner')) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { action, count, comment } = req.body; // action: 'approve' | 'reject'
  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Укажите действие: approve или reject' });
  }

  const db = getDb();
  try {
    const request = db.prepare('SELECT * FROM lead_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Заявка не найдена' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Заявка уже обработана' });

    // Check admin is the right one
    if (userHasRole(req.user, 'team_leader') && !userHasRole(req.user, 'owner') && request.admin_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа к этой заявке' });
    }

    if (action === 'reject') {
      db.prepare(`
        UPDATE lead_requests SET status = 'rejected', comment = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(comment || '', req.params.id);

      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (?, 'lead_request', 'Заявка отклонена', ?)
      `).run(request.scout_id, `Ваша заявка на лиды была отклонена${comment ? ': ' + comment : ''}`);

      saveDatabase();
      return res.json({ message: 'Заявка отклонена' });
    }

    // Approve
    const approvedCount = parseInt(count);
    if (!approvedCount || approvedCount < 1) {
      return res.status(400).json({ error: 'Укажите количество лидов' });
    }

    // Get available leads from pool
    const availableLeads = db.prepare(`
      SELECT id FROM leads WHERE status = 'new' AND scout_id IS NULL ORDER BY RANDOM() LIMIT ?
    `).all(approvedCount);

    if (availableLeads.length === 0) {
      return res.status(400).json({ error: 'Нет доступных лидов в общей базе' });
    }

    const actualCount = availableLeads.length;

    // Assign leads to scout
    for (const lead of availableLeads) {
      db.prepare(`
        UPDATE leads SET scout_id = ?, status = 'in_progress', assigned_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(request.scout_id, lead.id);
    }

    // Update request
    db.prepare(`
      UPDATE lead_requests SET status = 'approved', approved_count = ?, comment = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(actualCount, comment || '', req.params.id);

    // Notify scout
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, 'lead_request', 'Лиды выданы', ?)
    `).run(request.scout_id, `Вам выдано ${actualCount} лидов`);

    saveDatabase();
    res.json({ message: `Выдано ${actualCount} лидов`, assigned: actualCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===================== ADMIN: SCOUT REPORTS =====================

// Get scouts list with lead stats (for admin)
router.get('/scouts', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'team_leader', 'owner')) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const db = getDb();
  try {
    let scoutsQuery;
    const params = [];

    if (userHasRole(req.user, 'team_leader') && !userHasRole(req.user, 'owner')) {
      // Get scouts in admin's squad
      const squad = db.prepare('SELECT id FROM squads WHERE admin_id = ?').get(req.user.id);
      if (!squad) return res.json([]);
      scoutsQuery = `
        SELECT u.id, u.full_name, u.username, u.avatar,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id) as total_leads,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'in_progress') as in_progress,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'contacted') as contacted,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'refused') as refused,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'ignored') as ignored,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'processed') as processed
        FROM users u
        WHERE u.role LIKE '%scout%' AND u.squad_id = ? AND u.is_active = 1
        ORDER BY u.full_name
      `;
      params.push(squad.id);
    } else {
      // Owner sees all scouts
      scoutsQuery = `
        SELECT u.id, u.full_name, u.username, u.avatar,
          s.name as squad_name,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id) as total_leads,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'in_progress') as in_progress,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'contacted') as contacted,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'refused') as refused,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'ignored') as ignored,
          (SELECT COUNT(*) FROM leads WHERE scout_id = u.id AND status = 'processed') as processed
        FROM users u
        LEFT JOIN squads s ON u.squad_id = s.id
        WHERE u.role LIKE '%scout%' AND u.is_active = 1
        ORDER BY u.full_name
      `;
    }

    const scouts = db.prepare(scoutsQuery).all(...params);
    res.json(scouts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get leads for a specific scout (admin report)
router.get('/scouts/:scoutId', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'team_leader', 'owner')) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const db = getDb();
  try {
    const scoutId = parseInt(req.params.scoutId);
    const scout = db.prepare('SELECT id, full_name, username FROM users WHERE id = ?').get(scoutId);
    if (!scout) return res.status(404).json({ error: 'Скаут не найден' });

    const leads = db.prepare(`
      SELECT * FROM leads WHERE scout_id = ? ORDER BY assigned_at DESC
    `).all(scoutId);

    const stats = {
      total: leads.length,
      in_progress: leads.filter(l => l.status === 'in_progress').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      refused: leads.filter(l => l.status === 'refused').length,
      ignored: leads.filter(l => l.status === 'ignored').length,
      processed: leads.filter(l => l.status === 'processed').length,
    };

    res.json({ scout, leads, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
