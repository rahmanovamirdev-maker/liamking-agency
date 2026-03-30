const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, saveDatabase } = require('../database');
const { authMiddleware, userHasRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, safeName);
  }
});

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла'));
    }
  }
});

// Check if user has access to this application's chat
function checkChatAccess(db, applicationId, userId, userRole) {
  if (userHasRole({ role: userRole }, 'owner')) return true;
  const app = db.prepare('SELECT scout_id, admin_id, curator_id, hr_id, squad_id, direction FROM applications WHERE id = ?').get(applicationId);
  if (!app) return false;
  // Direct participants
  if ([app.scout_id, app.admin_id, app.curator_id, app.hr_id].includes(userId)) return true;
  // team_leader of the squad
  if (userHasRole({ role: userRole }, 'team_leader')) {
    const squad = db.prepare('SELECT id FROM squads WHERE admin_id = ?').get(userId);
    if (squad && app.squad_id === squad.id) return true;
  }
  // admin of the scout's team
  if (userHasRole({ role: userRole }, 'admin')) {
    const scout = db.prepare('SELECT team_id FROM users WHERE id = ?').get(app.scout_id);
    const admin = db.prepare('SELECT team_id FROM users WHERE id = ?').get(userId);
    if (scout && admin && scout.team_id === admin.team_id) return true;
  }
  // HR by direction
  if (userHasRole({ role: userRole }, 'hr_huntme') && app.direction === 'huntme') return true;
  if (userHasRole({ role: userRole }, 'hr_mason') && app.direction === 'mason') return true;
  return false;
}

// Get messages for an application
router.get('/:applicationId', authMiddleware, (req, res) => {
  const db = getDb();
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) return res.status(400).json({ error: 'Некорректный ID' });
  try {
    if (!checkChatAccess(db, applicationId, req.user.id, req.user.role)) {
      return res.status(403).json({ error: 'Нет доступа к этому чату' });
    }

    const messages = db.prepare(`
      SELECT m.*, u.full_name as user_name, u.avatar as user_avatar, u.role as user_role
      FROM application_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.application_id = ?
      ORDER BY m.created_at ASC
    `).all(applicationId);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Send a text message
router.post('/:applicationId', authMiddleware, (req, res) => {
  const db = getDb();
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) return res.status(400).json({ error: 'Некорректный ID' });
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }

  try {
    if (!checkChatAccess(db, applicationId, req.user.id, req.user.role)) {
      return res.status(403).json({ error: 'Нет доступа к этому чату' });
    }

    const result = db.prepare(
      'INSERT INTO application_messages (application_id, user_id, message) VALUES (?, ?, ?)'
    ).run(applicationId, req.user.id, message.trim());

    // Notify other participants
    notifyChatParticipants(db, applicationId, req.user.id, req.user.full_name, message.trim());

    saveDatabase();
    res.status(201).json({ id: result.lastInsertRowid, message: 'Сообщение отправлено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Send a message with file attachment
router.post('/:applicationId/upload', authMiddleware, (req, res) => {
  const db = getDb();
  const applicationId = parseInt(req.params.applicationId);
  if (isNaN(applicationId)) return res.status(400).json({ error: 'Некорректный ID' });

  if (!checkChatAccess(db, applicationId, req.user.id, req.user.role)) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой (макс. 5 МБ)' });
      }
      return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не прикреплён' });
    }

    try {
      const message = req.body.message || '';
      const filePath = `/api/uploads/chat/${req.file.filename}`;

      const result = db.prepare(
        'INSERT INTO application_messages (application_id, user_id, message, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(applicationId, req.user.id, message.trim(), req.file.originalname, filePath, req.file.mimetype);

      notifyChatParticipants(db, applicationId, req.user.id, req.user.full_name, '📎 Файл: ' + req.file.originalname);

      saveDatabase();
      res.status(201).json({
        id: result.lastInsertRowid,
        file_name: req.file.originalname,
        file_path: filePath,
        file_type: req.file.mimetype,
      });
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });
});

// Notify all attached users except the sender
function notifyChatParticipants(db, applicationId, senderId, senderName, messagePreview) {
  const app = db.prepare('SELECT id, candidate_name, scout_id, admin_id, curator_id, hr_id FROM applications WHERE id = ?').get(applicationId);
  if (!app) return;

  const participantIds = [app.scout_id, app.admin_id, app.curator_id, app.hr_id].filter(id => id && id !== senderId);
  const uniqueIds = [...new Set(participantIds)];

  const preview = messagePreview.length > 80 ? messagePreview.substring(0, 80) + '…' : messagePreview;

  for (const userId of uniqueIds) {
    db.prepare(
      'INSERT INTO notifications (user_id, type, title, message, application_id) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'chat_message', `Новое сообщение — ${app.candidate_name}`, `${senderName}: ${preview}`, applicationId);
  }
}

module.exports = router;
