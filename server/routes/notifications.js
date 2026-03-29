const express = require('express');
const { getDb, saveDatabase } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get notifications for current user
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(req.user.id);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const { count } = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Mark all as read (MUST be before /:id/read to avoid route conflict)
router.put('/read-all', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    saveDatabase();
    res.json({ message: 'Все прочитано' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Mark as read
router.put('/:id/read', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const nid = parseInt(req.params.id);
    if (isNaN(nid)) return res.status(400).json({ error: 'Некорректный ID' });
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
      .run(nid, req.user.id);
    saveDatabase();
    res.json({ message: 'Прочитано' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
