const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { authMiddleware, roleMiddleware, userHasRole } = require('../middleware/auth');

const VALID_ROLES = ['owner', 'team_leader', 'admin', 'curator', 'hr', 'hr_huntme', 'hr_mason', 'scout'];

const router = express.Router();

// Get all users (owner/admin)
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    let users;
    if (userHasRole(req.user, 'owner', 'team_leader')) {
      users = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.avatar, u.about, u.wallet, u.role,
               u.squad_id, u.team_id, u.is_active, u.created_at,
               s.name as squad_name, t.name as team_name
        FROM users u
        LEFT JOIN squads s ON u.squad_id = s.id
        LEFT JOIN teams t ON u.team_id = t.id
        ORDER BY u.role, u.full_name
      `).all();
    } else {
      users = [];
    }
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create user (owner or team_leader)
router.post('/', authMiddleware, roleMiddleware('owner', 'team_leader'), (req, res) => {
  const { username, password, full_name, role, squad_id, team_id } = req.body;
  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }
  if (username.length < 2 || username.length > 50) {
    return res.status(400).json({ error: 'Логин должен быть от 2 до 50 символов' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }
  // role can be comma-separated, e.g. "admin,curator"
  const roles = role.split(',').map(r => r.trim()).filter(Boolean);
  if (roles.length === 0 || !roles.every(r => VALID_ROLES.includes(r))) {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }
  // team_leader cannot create owner or team_leader accounts
  if (userHasRole(req.user, 'team_leader') && !userHasRole(req.user, 'owner')) {
    if (roles.includes('owner') || roles.includes('team_leader')) {
      return res.status(403).json({ error: 'Недостаточно прав для создания этой роли' });
    }
  }
  const normalizedRole = roles.join(',');

  const db = getDb();
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, squad_id, team_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, hash, full_name, normalizedRole, squad_id || null, team_id || null);

    const { saveDatabase } = require('../database');
    saveDatabase();
    res.status(201).json({ id: result.lastInsertRowid, message: 'Пользователь создан' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update user (owner or self)
router.put('/:id', authMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Некорректный ID' });
  const isRealOwner = userHasRole(req.user, 'owner');
  const isTeamLeader = userHasRole(req.user, 'team_leader');
  const isOwner = isRealOwner || isTeamLeader;
  const isSelf = req.user.id === userId;

  if (!isOwner && !isSelf) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const db = getDb();
  try {
    const { full_name, about, wallet, role, squad_id, team_id, is_active, password } = req.body;
    const updates = [];
    const values = [];

    if (full_name !== undefined) { updates.push('full_name = ?'); values.push(full_name); }
    if (about !== undefined) { updates.push('about = ?'); values.push(about); }
    if (wallet !== undefined) { updates.push('wallet = ?'); values.push(wallet); }
    if (isOwner && role !== undefined) {
      // Validate multi-role
      const roles = role.split(',').map(r => r.trim()).filter(Boolean);
      if (roles.length === 0 || !roles.every(r => VALID_ROLES.includes(r))) {
        return res.status(400).json({ error: 'Недопустимая роль' });
      }
      // team_leader cannot assign owner/team_leader roles
      if (isTeamLeader && !isRealOwner) {
        if (roles.includes('owner') || roles.includes('team_leader')) {
          return res.status(403).json({ error: 'Недостаточно прав для назначения этой роли' });
        }
      }
      // Prevent self-role-elevation
      if (isSelf && !isRealOwner) {
        return res.status(403).json({ error: 'Нельзя менять свою роль' });
      }
      updates.push('role = ?'); values.push(roles.join(','));
    }
    if (isOwner && squad_id !== undefined) { updates.push('squad_id = ?'); values.push(squad_id || null); }
    if (isOwner && team_id !== undefined) { updates.push('team_id = ?'); values.push(team_id || null); }
    if (isOwner && is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (isOwner && password) {
      updates.push('password_hash = ?');
      values.push(bcrypt.hashSync(password, 10));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const { saveDatabase } = require('../database');
    saveDatabase();
    res.json({ message: 'Пользователь обновлён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get user by id
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const user = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar, u.about, u.wallet, u.role,
             u.squad_id, u.team_id, u.is_active, u.created_at,
             s.name as squad_name, t.name as team_name
      FROM users u
      LEFT JOIN squads s ON u.squad_id = s.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = ?
    `).get(req.params.id);

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
