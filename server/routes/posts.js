const express = require('express');
const { getDb } = require('../database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get posts
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const posts = db.prepare(`
      SELECT p.*, u.full_name as author_name, u.avatar as author_avatar,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      ORDER BY p.is_pinned DESC, p.created_at DESC
    `).all();
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get single post with comments
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const post = db.prepare(`
      SELECT p.*, u.full_name as author_name, u.avatar as author_avatar
      FROM posts p LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!post) return res.status(404).json({ error: 'Пост не найден' });

    // Increment views
    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(req.params.id);

    const comments = db.prepare(`
      SELECT c.*, u.full_name as user_name, u.avatar as user_avatar
      FROM comments c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);

    res.json({ ...post, views: post.views + 1, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create post (owner only)
router.post('/', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const { title, content, is_pinned } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Заполните заголовок и содержание' });
  }

  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO posts (title, content, author_id, is_pinned)
      VALUES (?, ?, ?, ?)
    `).run(title, content, req.user.id, is_pinned ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Пост создан' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update post
router.put('/:id', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const { title, content, is_pinned } = req.body;
  const db = getDb();
  try {
    const updates = [];
    const values = [];
    if (title) { updates.push('title = ?'); values.push(title); }
    if (content) { updates.push('content = ?'); values.push(content); }
    if (is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(is_pinned ? 1 : 0); }
    values.push(req.params.id);
    db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ message: 'Пост обновлён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Delete post
router.delete('/:id', authMiddleware, roleMiddleware('owner'), (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Пост удалён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Add comment
router.post('/:id/comments', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Введите комментарий' });

  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(req.params.id, req.user.id, content);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Комментарий добавлен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
