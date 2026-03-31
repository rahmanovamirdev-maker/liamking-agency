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

// Valid statuses per direction + app_type for HR
const directionStatuses = {
  huntme: {
    model: ['recorded', 'interview_came', 'registration', 'active', 'interview_noshow', 'rejected', 'interview_ignored'],
    operator: ['recorded', 'interview_came', 'interview_noshow', 'training', 'rejected', 'interview_ignored'],
  },
  mason: {
    model: ['ignored', 'interview_came', 'interview_noshow', 'registration', 'rejected'],
    operator: ['ignored', 'interview_came', 'interview_noshow', 'registration', 'rejected'],
  },
};

// Get applications (filtered by role)
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const { status, squad_id, search, app_type, direction, page = 1, limit = 50 } = req.query;
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

    // Role-based filtering
    const userRoles = req.user.role.split(',');
    if (userHasRole(req.user, 'owner')) {
      // owner sees all
    } else if (userHasRole(req.user, 'team_leader')) {
      const squad = db.prepare('SELECT id FROM squads WHERE admin_id = ?').get(req.user.id);
      if (squad) {
        conditions.push('a.squad_id = ?');
        params.push(squad.id);
      } else {
        conditions.push('a.admin_id = ?');
        params.push(req.user.id);
      }
    } else if (userHasRole(req.user, 'admin')) {
      // New admin role: sees only their team's scouts' applications
      const teamScouts = db.prepare(
        'SELECT id FROM users WHERE team_id = ? AND role LIKE ?'
      ).all(req.user.team_id, '%scout%');
      const scoutIds = teamScouts.map(s => s.id);
      if (scoutIds.length > 0) {
        conditions.push('a.scout_id IN (' + scoutIds.map(() => '?').join(',') + ')');
        params.push(...scoutIds);
      } else {
        conditions.push('1=0');
      }
    } else if (userHasRole(req.user, 'hr_huntme') || userHasRole(req.user, 'hr_mason')) {
      const roleConds = [];
      if (userRoles.includes('hr_huntme')) {
        roleConds.push("a.direction = 'huntme'");
      }
      if (userRoles.includes('hr_mason')) {
        roleConds.push("a.direction = 'mason'");
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
    } else {
      const roleConds = [];
      if (userRoles.includes('hr')) {
        roleConds.push('a.hr_id = ?');
        params.push(req.user.id);
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
    if (direction) {
      conditions.push('a.direction = ?');
      params.push(direction);
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
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 50;
    const offset = (parsedPage - 1) * parsedLimit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parsedLimit, offset);

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

    // Check access
    if (!userHasRole(req.user, 'owner')) {
      const hasDirectAccess = [app.scout_id, app.admin_id, app.curator_id, app.hr_id].includes(req.user.id);
      let hasRoleAccess = false;
      if (userHasRole(req.user, 'team_leader')) {
        const squad = db.prepare('SELECT id FROM squads WHERE admin_id = ?').get(req.user.id);
        hasRoleAccess = squad && app.squad_id === squad.id;
      } else if (userHasRole(req.user, 'admin')) {
        hasRoleAccess = app.admin_id === req.user.id || req.user.team_id === db.prepare('SELECT team_id FROM users WHERE id = ?').get(app.scout_id)?.team_id;
      } else if (userHasRole(req.user, 'hr_huntme')) {
        hasRoleAccess = app.direction === 'huntme';
      } else if (userHasRole(req.user, 'hr_mason')) {
        hasRoleAccess = app.direction === 'mason';
      }
      if (!hasDirectAccess && !hasRoleAccess) {
        return res.status(403).json({ error: 'Нет доступа к этой анкете' });
      }
    }

    const history = db.prepare(`
      Select h.*, u.full_name as user_name
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
    // Duplicate check by phone or telegram
    const dupeConditions = [];
    const dupeValues = [];
    if (candidate_phone) {
      dupeConditions.push('candidate_phone = ?');
      dupeValues.push(candidate_phone);
    }
    if (candidate_telegram) {
      dupeConditions.push('candidate_telegram = ?');
      dupeValues.push(candidate_telegram);
    }
    if (dupeConditions.length > 0) {
      const existing = db.prepare(
        `SELECT id, candidate_name, status FROM applications WHERE (${dupeConditions.join(' OR ')}) AND status NOT IN ('rejected') LIMIT 1`
      ).get(...dupeValues);
      if (existing) {
        return res.status(409).json({
          error: `Дубликат: анкета на "${existing.candidate_name}" уже существует (ID: ${existing.id})`
        });
      }
    }

    const scout = db.prepare('SELECT squad_id FROM users WHERE id = ?').get(req.user.id);
    const squadId = scout?.squad_id || null;

    let appId;
    if (app_type === 'model') {
      const { intro_name, vacancy_title, languages, intro_role, candidate_info, nude_type, candidate_photo } = req.body;
      const result = db.prepare(`
        INSERT INTO applications (app_type, candidate_name, candidate_age, candidate_phone, candidate_telegram,
          intro_name, vacancy_title, languages, intro_role, candidate_info, nude_type, candidate_photo, scout_id, squad_id, status)
        VALUES ('model', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')
      `).run(candidate_name, candidate_age || '', candidate_phone || '', candidate_telegram || '',
        intro_name || '', vacancy_title || '', languages || '', intro_role || '',
        candidate_info || '', nude_type || '', candidate_photo || null, req.user.id, squadId);
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

// Direct application to partner (admin sets direction: huntme or mason)
router.put('/:id/direction', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'owner', 'team_leader')) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const { direction } = req.body;
  if (!direction || !['huntme', 'mason'].includes(direction)) {
    return res.status(400).json({ error: 'Укажите направление: huntme или mason' });
  }

  const db = getDb();
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Анкета не найдена' });
    if (app.status !== 'pending_review') {
      return res.status(400).json({ error: 'Анкету можно направить только со статуса "На рассмотрении"' });
    }

    db.prepare(`UPDATE applications SET direction = ?, status = 'directed', admin_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(direction, req.user.id, req.params.id);

    const dirLabel = direction === 'huntme' ? 'HuntMe' : 'Mason';
    db.prepare(`
      INSERT INTO application_history (application_id, old_status, new_status, changed_by, comment)
      VALUES (?, ?, 'directed', ?, ?)
    `).run(req.params.id, app.status, req.user.id, `Направлена на партнёра: ${dirLabel}`);

    // Notify scout
    createNotification(db, app.scout_id, 'status_change', 'Анкета направлена',
      `Анкета "${app.candidate_name}" направлена на ${dirLabel}`, app.id);

    // Notify all HR of the matching direction (except the scout and the person who directed)
    const hrRole = direction === 'huntme' ? 'hr_huntme' : 'hr_mason';
    const hrUsers = db.prepare("SELECT id FROM users WHERE role LIKE ? AND is_active = 1").all(`%${hrRole}%`);
    for (const hr of hrUsers) {
      if (hr.id !== app.scout_id && hr.id !== req.user.id) {
        createNotification(db, hr.id, 'new_application', 'Новая анкета',
          `Анкета "${app.candidate_name}" направлена на ${dirLabel}`, app.id);
      }
    }

    saveDatabase();
    res.json({ message: `Анкета направлена на ${dirLabel}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update application status (HR flow within direction)
router.put('/:id/status', authMiddleware, (req, res) => {
  const { status, comment, rejection_reason } = req.body;
  if (!status) return res.status(400).json({ error: 'Укажите новый статус' });

  const db = getDb();
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Анкета не найдена' });

    // Owner can do anything
    if (userHasRole(req.user, 'owner')) {
      // allowed
    } else if (userHasRole(req.user, 'hr_huntme') && app.direction === 'huntme') {
      const allowed = directionStatuses.huntme[app.app_type] || [];
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Недопустимый статус для данного направления' });
    } else if (userHasRole(req.user, 'hr_mason') && app.direction === 'mason') {
      const allowed = directionStatuses.mason[app.app_type] || [];
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Недопустимый статус для данного направления' });
    } else if (userHasRole(req.user, 'team_leader')) {
      if (app.status === 'pending_review' && status === 'rejected') {
        // allowed
      } else {
        return res.status(403).json({ error: 'Сквад Лидер может только отклонить анкету на рассмотрении' });
      }
    } else {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];

    if (rejection_reason && status === 'rejected') {
      updates.push('rejection_reason = ?');
      values.push(rejection_reason);
    }

    values.push(req.params.id);
    db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    db.prepare(`
      INSERT INTO application_history (application_id, old_status, new_status, changed_by, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, app.status, status, req.user.id, comment || '');

    // Notify scout about status change
    createNotification(db, app.scout_id, 'status_change', 'Статус анкеты изменён',
      `Анкета "${app.candidate_name}" — новый статус`, app.id);

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
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Анкета не найдена' });

    // Check access: owner, team_leader of squad, admin of team, or scout who created it
    if (!userHasRole(req.user, 'owner')) {
      const isScout = app.scout_id === req.user.id;
      const isAdmin = userHasRole(req.user, 'team_leader', 'admin') && [app.admin_id].includes(req.user.id);
      let isSquadLeader = false;
      if (userHasRole(req.user, 'team_leader')) {
        const squad = db.prepare('SELECT id FROM squads WHERE admin_id = ?').get(req.user.id);
        isSquadLeader = squad && app.squad_id === squad.id;
      }
      if (!isScout && !isAdmin && !isSquadLeader) {
        return res.status(403).json({ error: 'Нет прав на редактирование' });
      }
    }

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

// Delete application permanently (owner only)
router.delete('/:id', authMiddleware, (req, res) => {
  if (!userHasRole(req.user, 'owner')) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  const db = getDb();
  try {
    const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Анкета не найдена' });

    db.prepare('DELETE FROM application_history WHERE application_id = ?').run(req.params.id);
    db.prepare('DELETE FROM application_messages WHERE application_id = ?').run(req.params.id);
    db.prepare('DELETE FROM notifications WHERE application_id = ?').run(req.params.id);
    db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);

    saveDatabase();
    res.json({ message: 'Анкета удалена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
