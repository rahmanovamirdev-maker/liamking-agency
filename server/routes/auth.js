const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDatabase } = require('../database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...userData } = user;
  res.json({ token, user: userData });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.*, s.name as squad_name, t.name as team_name
    FROM users u
    LEFT JOIN squads s ON u.squad_id = s.id
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const { password_hash, ...userData } = user;
  res.json(userData);
});

// Change password
router.put('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Неверный текущий пароль' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  saveDatabase();
  res.json({ message: 'Пароль изменён' });
});

module.exports = router;
