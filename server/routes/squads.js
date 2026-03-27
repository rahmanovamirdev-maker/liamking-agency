const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all squads
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const squads = db.prepare(`
      SELECT s.*, u.full_name as admin_name,
        (SELECT COUNT(*) FROM users WHERE squad_id = s.id) as member_count
      FROM squads s
      LEFT JOIN users u ON s.admin_id = u.id
      ORDER BY s.name
    `).all();
    res.json(squads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get squad with full hierarchy
router.get('/:id/hierarchy', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const squad = db.prepare(`
      SELECT s.*, u.full_name as admin_name
      FROM squads s LEFT JOIN users u ON s.admin_id = u.id
      WHERE s.id = ?
    `).get(req.params.id);
    if (!squad) return res.status(404).json({ error: 'Сквад не найден' });

    const teams = db.prepare(`
      SELECT t.*, u.full_name as leader_name
      FROM teams t LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.squad_id = ?
    `).all(req.params.id);

    for (const team of teams) {
      team.members = db.prepare(`
        SELECT id, username, full_name, role, avatar FROM users WHERE team_id = ?
      `).all(team.id);
    }

    res.json({ ...squad, teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create squad (owner only)
router.post('/', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const { name, admin_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Введите название сквада' });

  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO squads (name, admin_id) VALUES (?, ?)').run(name, admin_id || null);
    if (admin_id) {
      db.prepare('UPDATE users SET squad_id = ? WHERE id = ?').run(result.lastInsertRowid, admin_id);
    }
    res.status(201).json({ id: result.lastInsertRowid, message: 'Сквад создан' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update squad
router.put('/:id', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const { name, admin_id } = req.body;
  const db = getDb();
  try {
    const updates = [];
    const values = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (admin_id !== undefined) { updates.push('admin_id = ?'); values.push(admin_id || null); }
    if (updates.length === 0) return res.status(400).json({ error: 'Нет данных' });

    values.push(req.params.id);
    db.prepare(`UPDATE squads SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ message: 'Сквад обновлён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Delete squad
router.delete('/:id', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM squads WHERE id = ?').run(req.params.id);
    res.json({ message: 'Сквад удалён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// --- Teams ---
router.get('/:squadId/teams', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const teams = db.prepare(`
      SELECT t.*, u.full_name as leader_name,
        (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.leader_id = u.id
      WHERE t.squad_id = ?
    `).all(req.params.squadId);
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:squadId/teams', authMiddleware, roleMiddleware('owner', 'admin'), (req, res) => {
  const { name, leader_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Введите название команды' });

  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO teams (name, squad_id, leader_id) VALUES (?, ?, ?)')
      .run(name, req.params.squadId, leader_id || null);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Команда создана' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
