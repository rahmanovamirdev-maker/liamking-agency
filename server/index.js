const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/squads', require('./routes/squads'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));

// ONE-TIME seed endpoint — creates real users inside the running process memory
app.post('/api/admin/seed-users', (req, res) => {
  const bcrypt = require('bcryptjs');
  const { getDb, saveDatabase } = require('./database');
  const SECRET = 'LIAMKING_SEED_2026';
  
  if (req.body.secret !== SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = getDb();
  const SQUAD_ID = 2;

  // Delete ALL placeholder users
  const del = db.prepare("DELETE FROM users WHERE username LIKE '%_scout%' AND username NOT IN ('owner','test','franklind0n')").run();

  const users = [
    { username: 'Uxfyh', full_name: 'Данил', role: 'admin', team_id: 3, leader: true },
    { username: 'quincyymeow', full_name: 'Кирюша', role: 'scout', team_id: 3 },
    { username: 'Lucky_HRR', full_name: 'Lucky', role: 'scout', team_id: 3 },
    { username: 'Camel', full_name: 'Camel', role: 'scout', team_id: 3 },
    { username: 'Nkrt5', full_name: 'HZ', role: 'scout', team_id: 3 },
    { username: 'dianakisc', full_name: 'DianaKisc', role: 'scout', team_id: 3 },
    { username: 'preFerms', full_name: 'ProGect', role: 'scout', team_id: 3 },
    { username: 'ProgarsoX', full_name: 'ProfileInfo', role: 'scout', team_id: 3 },
    { username: 'YanixqM', full_name: 'Пиздюк', role: 'scout', team_id: 3 },
    { username: 'x9ijeeee', full_name: 'X9ije', role: 'scout', team_id: 3 },
    { username: 'fg_andyha', full_name: 'Андрей', role: 'scout', team_id: 3 },
    { username: 'lovetrentwins', full_name: 'Toyxi', role: 'scout', team_id: 3 },
    { username: 'Delerikk', full_name: 'Deleriks', role: 'scout', team_id: 3 },
    { username: 'Rinxx69', full_name: 'Rinix', role: 'scout', team_id: 3 },
    { username: 'sflaa', full_name: 'sflaa', role: 'scout', team_id: 3 },
    { username: 'zyrmorthalis', full_name: 'Иван', role: 'scout', team_id: 3 },
    { username: 'Kentikgg', full_name: 'Костик', role: 'scout', team_id: 3 },
    { username: 'Monk161', full_name: 'Монк', role: 'scout', team_id: 3 },
    { username: 'Martonizm', full_name: 'Мерен', role: 'scout', team_id: 3 },
    { username: 'cvv342', full_name: 'Максим', role: 'scout', team_id: 3 },
    { username: 'hempsey', full_name: 'Hepsey', role: 'scout', team_id: 3 },
    { username: 'zona1365', full_name: 'Илья', role: 'admin', team_id: 4, leader: true },
    { username: 'iammakatao', full_name: 'iammakatao', role: 'scout', team_id: 4 },
    { username: 'jewelrydealer', full_name: 'jewelrydealer', role: 'scout', team_id: 4 },
    { username: 'themothmannn', full_name: 'themothmannn', role: 'scout', team_id: 4 },
    { username: 'Skau700', full_name: 'Skau700', role: 'scout', team_id: 4 },
    { username: 'yebiwiehh_0', full_name: 'yebiwiehh_0', role: 'scout', team_id: 4 },
    { username: 'endsdxsz', full_name: 'endsdxsz', role: 'scout', team_id: 4 },
    { username: 'Who_am1q', full_name: 'Who_am1q', role: 'scout', team_id: 4 },
    { username: 'burgerkoin1', full_name: 'burgerkoin1', role: 'scout', team_id: 4 },
    { username: 'Potuzna', full_name: 'Potuzna', role: 'scout', team_id: 4 },
    { username: 'ghressss', full_name: 'ghressss', role: 'scout', team_id: 4 },
    { username: 'zhanuse4ka', full_name: 'zhanuse4ka', role: 'scout', team_id: 4 },
    { username: 'andron1211', full_name: 'andron1211', role: 'scout', team_id: 4 },
    { username: 'mrMaksutka', full_name: 'mrMaksutka', role: 'scout', team_id: 4 },
    { username: 'RyzeLox', full_name: 'RyzeLox', role: 'scout', team_id: 4 },
    { username: 'daniilkarpenkoo', full_name: 'daniilkarpenkoo', role: 'scout', team_id: 4 },
    { username: 'spcopap', full_name: 'spcopap', role: 'scout', team_id: 4 },
    { username: 'EvkNnnn', full_name: 'EvkNnnn', role: 'scout', team_id: 4 },
    { username: 'flex_seks', full_name: 'flex_seks', role: 'scout', team_id: 4 },
    { username: 'Chebur098', full_name: 'Chebur098', role: 'scout', team_id: 4 },
    { username: 'glavstroy7777', full_name: 'glavstroy7777', role: 'scout', team_id: 4 },
    { username: 'detochka2000', full_name: 'detochka2000', role: 'scout', team_id: 4 },
    { username: 'I_nikto_blya', full_name: 'I_nikto_blya', role: 'scout', team_id: 4 },
    { username: 'xcwwsd', full_name: 'xcwwsd', role: 'scout', team_id: 4 },
    { username: 'vse_ssmm', full_name: 'vse_ssmm', role: 'scout', team_id: 4 },
    { username: 'Qepcyc', full_name: 'Qepcyc', role: 'scout', team_id: 4 },
    { username: 'senllov', full_name: 'senllov', role: 'scout', team_id: 4 },
    { username: 'indarusix', full_name: 'indarusix', role: 'scout', team_id: 4 },
    { username: 'chapmenq', full_name: 'chapmenq', role: 'scout', team_id: 4 },
    { username: 'Rouserp', full_name: 'Гриша', role: 'admin', team_id: 6, leader: true },
    { username: 'lskdbdaru', full_name: 'lskdbdaru', role: 'scout', team_id: 6 },
    { username: 'frol1k', full_name: 'frol1k', role: 'scout', team_id: 6 },
    { username: 'graliksonCEO', full_name: 'Боря', role: 'scout', team_id: 6 },
    { username: 'notevenghost', full_name: 'Полина', role: 'scout', team_id: 7 },
    { username: 'romashka1_16', full_name: 'Ромашка', role: 'scout', team_id: 7 },
    { username: 'kerwieska', full_name: 'kerwieska', role: 'scout', team_id: 7 },
    { username: 'riphmastt', full_name: 'Катя', role: 'scout', team_id: 7 },
    { username: 'avosinahelas', full_name: 'Влада', role: 'scout', team_id: 7 },
    { username: 'polika_cherez', full_name: 'Полина 2', role: 'scout', team_id: 7 },
  ];

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  function genPass() {
    let p = '';
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return p + '!';
  }

  const results = [];
  for (const u of users) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (exists) {
      if (u.leader) db.prepare('UPDATE teams SET leader_id = ? WHERE id = ?').run(exists.id, u.team_id);
      continue;
    }
    const pass = genPass();
    const hash = bcrypt.hashSync(pass, 10);
    const r = db.prepare('INSERT INTO users (username, password_hash, full_name, role, squad_id, team_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(u.username, hash, u.full_name, u.role, SQUAD_ID, u.team_id);
    if (u.leader) db.prepare('UPDATE teams SET leader_id = ? WHERE id = ?').run(r.lastInsertRowid, u.team_id);
    results.push({ username: u.username, password: pass, role: u.role, team_id: u.team_id });
  }

  saveDatabase();
  const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  res.json({ created: results.length, total, deleted: del.changes, users: results });
});

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});



// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Initialize database then start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
