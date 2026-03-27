const express = require('express');
const { getDb, saveDatabase } = require('../database');
const { authMiddleware, roleMiddleware, userHasRole } = require('../middleware/auth');

const router = express.Router();

function createNotification(db, userId, type, title, message, applicationId) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, application_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, type, title, message, applicationId || null);
}

// Get applications (filtered by role)
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const { status, squad_id, search, app_type, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT a.*,
        scout.full_name as scout_name,
        adm.full_name as admin_name,
        cur.full_name as curator_name,
        hr.full_name as hr_name,
        s.name as squad_name
      FROM applications a
      LEFT JOIN users scout ON a.scout_id = scout.id
      LEFT JOIN users adm ON a.admin_id = adm.id
      LEFT JOIN users cur ON a.curator_id = cur.id
      LEFT JOIN users hr ON a.hr_id = hr.id
      LEFT JOIN squads s ON a.squad_id = s.id
    `;

    const conditions = [];
    const params = [];

    // Role-based filtering (pick the highest-privilege role for filtering)
    const userRoles = req.user.role.split(',');
    if (userHasRole(req.user, 'owner')) {
      // owner sees all
    } else if (userHasRole(req.user, 'admin')) {
      const squad = db.prepare('SELECT id FROM squads WHERE admin_id = ?').get(req.user.id);
      if (squad) {
        conditions.push('a.squad_id = ?');
        params.push(squad.id);
      } else {
        conditions.push('a.admin_id = ?');
        params.push(req.user.id);
      }
    } else {
      // Build OR conditions for each non-owner/non-admin role
      const roleConds = [];
      if (userRoles.includes('curator')) {
        roleConds.push('(a.curator_id = ? OR a.status = ?)');
        params.push(req.user.id, 'reviewed');
      }
      if (userRoles.includes('hr')) {
        roleConds.push('(a.hr_id = ? OR a.status = ?)');
        params.push(req.user.id, 'interviewing');
      }
      if (userRoles.includes('scout')) {
        roleConds.push('a.scout_id = ?');
        params.push(req.user.id);
      }
      if (roleConds.length > 0) {
        conditions.push('(' + roleConds.join(' OR ') + ')');
      } else {
        conditions.push('1=0');
      }
    }

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (app_type) {
      conditions.push('a.app_type = ?');
      params.push(app_type);
    }
    if (squad_id) {
      conditions.push('a.squad_id = ?');
      params.push(squad_id);
    }
    if (search) {
      conditions.push('(a.candidate_name LIKE ? OR a.candidate_phone LIKE ? OR a.candidate_telegram LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.updated_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const applications = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM applications a';
    const countParams = [...params];
    countParams.pop(); // remove offset
    countParams.pop(); // remove limit
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ applications, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get single application
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const app = db.prepare(`
      SELECT a.*,
        scout.full_name as scout_name,
        adm.full_name as admin_name,
        cur.full_name as curator_name,
        hr.full_name as hr_name,
        s.name as squad_name
      FROM applications a
      LEFT JOIN users scout ON a.scout_id = scout.id
      LEFT JOIN users adm ON a.admin_id = adm.id
      LEFT JOIN users cur ON a.curator_id = cur.id
      LEFT JOIN users hr ON a.hr_id = hr.id
      LEFT JOIN squads s ON a.squad_id = s.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!app) return res.status(404).json({ error: 'Анкета не найдена' });

    const history = db.prepare(`
      SELECT h.*, u.full_name as user_name
      FROM application_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.application_id = ?
      ORDER BY h.created_at DESC
    `).all(req.params.id);

    res.json({ ...app, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Create application (scout)
router.post('/', authMiddleware, (req, res) => {
  const { app_type } = req.body;
  if (!app_type || !['model', 'operator'].includes(app_type)) {
    return res.status(400).json({ error: 'Укажите тип анкеты: model или operator' });
  }

  const { candidate_name, candidate_age, candidate_phone, candidate_telegram } = req.body;
  if (!candidate_name) {
    return res.status(400).json({ error: 'Введите имя кандидата' });
  }

  const db = getDb();
  try {
    const scout = db.prepare('SELECT squad_id FROM users WHERE id = ?').get(req.user.id);
    const squadId = scout?.squad_id || null;

    let appId;
    if (app_type === 'model') {
      const { intro_name, vacancy_title, languages, intro_role, candidate_info, candidate_photo } = req.body;
      const result = db.prepare(`
        INSERT INTO applications (app_type, candidate_name, candidate_age, candidate_phone, candidate_telegram,
          intro_name, vacancy_title, languages, intro_role, candidate_info, candidate_photo, scout_id, squad_id, status)
        VALUES ('model', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')
      `).run(candidate_name, candidate_age || '', candidate_phone || '', candidate_telegram || '',
        intro_name || '', vacancy_title || '', languages || '', intro_role || '',
        candidate_info || '', candidate_photo || null, req.user.id, squadId);
      appId = result.lastInsertRowid;
    } else {
      const { company_name, english_level, work_experience, pc_specs } = req.body;
      const result = db.prepare(`
        INSERT INTO applications (app_type, candidate_name, candidate_age, candidate_phone, candidate_telegram,
          company_name, english_level, work_experience, pc_specs, scout_id, squad_id, status)
        VALUES ('operator', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')
      `).run(candidate_name, candidate_age || '', candidate_phone || '', candidate_telegram || '',
        company_name || '', english_level || '', work_experience || '', pc_specs || '',
        req.user.id, squadId);
      appId = result.lastInsertRowid;
    }

    const typeLabel = app_type === 'model' ? 'модель' : 'оператора';
    db.prepare(`
      INSERT INTO application_history (application_id, old_status, new_status, changed_by, comment)
      VALUES (?, NULL, 'pending_review', ?, ?)
    `).run(appId, req.user.id, `Анкета на ${typeLabel} создана`);

    if (squadId) {
      const squad = db.prepare('SELECT admin_id FROM squads WHERE id = ?').get(squadId);
      if (squad?.admin_id) {
        createNotification(db, squad.admin_id, 'new_application', `Новая анкета (${typeLabel})`,
          `Скаут ${req.user.full_name} подал анкету на ${typeLabel}: ${candidate_name}`, appId);
      }
    }

    saveDatabase();
    res.status(201).json({ id: appId, message: `Анкета на ${typeLabel} создана` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update application status
router.put('/:id/status', authMiddleware, (req, res) => {
  const { status, comment, curator_id, hr_id } = req.body;
  if (!status) return res.status(400).json({ error: 'Укажите новый статус' });

  const allowedTransitions = {
    owner: {
      pending_review: ['reviewed', 'rejected'],
      reviewed: ['interviewing', 'rejected'],
      interviewing: ['registering', 'no_show', 'rejected'],
      no_show: ['interviewing', 'rejected'],
      registering: ['rejected'],
      rejected: ['pending_review'],
    },
    admin: {
      pending_review: ['reviewed', 'rejected'],
    },
    curator: {
      reviewed: ['interviewing'],
      interviewing: ['registering', 'no_show', 'rejected'],
    },
    hr: {
      registering: ['rejected'],
    },
    scout: {},
  };

  const role = req.user.role;
    const userRoles = role.split(',');
    const db = getDb();
    try {
      const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
      if (!app) return res.status(404).json({ error: 'Анкета не найдена' });

      // Merge allowed transitions from all user roles
      const mergedAllowed = new Set();
      for (const r of userRoles) {
        const trans = allowedTransitions[r]?.[app.status];
        if (trans) trans.forEach(t => mergedAllowed.add(t));
      }
      if (!mergedAllowed.has(status)) {
    }

    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];

    if (status === 'reviewed') {
      updates.push('admin_id = ?');
      values.push(req.user.id);
    }
    if (curator_id || status === 'interviewing') {
      updates.push('curator_id = ?');
      values.push(curator_id || req.user.id);
    }
    if (hr_id || status === 'registering') {
      updates.push('hr_id = ?');
      values.push(hr_id || req.user.id);
    }

    values.push(req.params.id);
    db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    db.prepare(`
      INSERT INTO application_history (application_id, old_status, new_status, changed_by, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, app.status, status, req.user.id, comment || '');

    const statusMessages = {
      'reviewed': { userId: app.scout_id, title: 'Анкета рассмотрена', msg: `Анкета "${app.candidate_name}" рассмотрена и одобрена` },
      'interviewing': { userId: curator_id, title: 'Новая анкета для собеседования', msg: `Вам назначена анкета: ${app.candidate_name}` },
      'no_show': { userId: app.scout_id, title: 'Не пришёл(ла)', msg: `Кандидат ${app.candidate_name} не пришёл(ла) на собеседование` },
      'registering': { userId: hr_id, title: 'Кандидат на регистрацию', msg: `Новый кандидат для регистрации: ${app.candidate_name}` },
      'rejected': { userId: app.scout_id, title: 'Отказано', msg: `Анкета "${app.candidate_name}" — отказано` },
    };

    const notif = statusMessages[status];
    if (notif && notif.userId) {
      createNotification(db, notif.userId, 'status_change', notif.title, notif.msg, app.id);
    }

    saveDatabase();
    res.json({ message: 'Статус обновлён' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update application info
router.put('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const values = [];

    const fields = [
      'candidate_name', 'candidate_phone', 'candidate_telegram', 'candidate_age',
      'intro_name', 'vacancy_title', 'languages', 'intro_role', 'candidate_info', 'candidate_photo',
      'company_name', 'english_level', 'work_experience', 'pc_specs', 'rejection_reason'
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (values.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });

    values.push(req.params.id);
    db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    saveDatabase();
    res.json({ message: 'Анкета обновлена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
