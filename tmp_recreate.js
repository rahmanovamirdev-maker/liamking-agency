const m = require('./server/database');
const bcrypt = require('bcryptjs');

m.initDatabase().then(() => {
  const db = m.getDb();
  const SQUAD_ID = 2;
  const teams = db.prepare('SELECT id, name FROM teams WHERE squad_id = ?').all(SQUAD_ID);
  console.log('Teams:', teams.map(t => `${t.id}: ${t.name}`).join(', '));

  const usersByTeam = {
    3: [ // Данил Team
      { username: 'danil_scout1', full_name: 'Данил Скаут 1', password: 'Scout1pass!' },
      { username: 'danil_scout2', full_name: 'Данил Скаут 2', password: 'Scout2pass!' },
      { username: 'danil_scout3', full_name: 'Данил Скаут 3', password: 'Scout3pass!' },
      { username: 'danil_scout4', full_name: 'Данил Скаут 4', password: 'Scout4pass!' },
      { username: 'danil_scout5', full_name: 'Данил Скаут 5', password: 'Scout5pass!' },
      { username: 'danil_scout6', full_name: 'Данил Скаут 6', password: 'Scout6pass!' },
      { username: 'danil_scout7', full_name: 'Данил Скаут 7', password: 'Scout7pass!' },
      { username: 'danil_scout8', full_name: 'Данил Скаут 8', password: 'Scout8pass!' },
      { username: 'danil_scout9', full_name: 'Данил Скаут 9', password: 'Scout9pass!' },
      { username: 'danil_scout10', full_name: 'Данил Скаут 10', password: 'Scout10pass!' },
      { username: 'danil_scout11', full_name: 'Данил Скаут 11', password: 'Scout11pass!' },
      { username: 'danil_scout12', full_name: 'Данил Скаут 12', password: 'Scout12pass!' },
      { username: 'danil_scout13', full_name: 'Данил Скаут 13', password: 'Scout13pass!' },
      { username: 'danil_scout14', full_name: 'Данил Скаут 14', password: 'Scout14pass!' },
      { username: 'danil_scout15', full_name: 'Данил Скаут 15', password: 'Scout15pass!' },
    ],
    4: [ // Илья Team
      { username: 'ilya_scout1', full_name: 'Илья Скаут 1', password: 'Scout1pass!' },
      { username: 'ilya_scout2', full_name: 'Илья Скаут 2', password: 'Scout2pass!' },
      { username: 'ilya_scout3', full_name: 'Илья Скаут 3', password: 'Scout3pass!' },
      { username: 'ilya_scout4', full_name: 'Илья Скаут 4', password: 'Scout4pass!' },
      { username: 'ilya_scout5', full_name: 'Илья Скаут 5', password: 'Scout5pass!' },
      { username: 'ilya_scout6', full_name: 'Илья Скаут 6', password: 'Scout6pass!' },
      { username: 'ilya_scout7', full_name: 'Илья Скаут 7', password: 'Scout7pass!' },
      { username: 'ilya_scout8', full_name: 'Илья Скаут 8', password: 'Scout8pass!' },
      { username: 'ilya_scout9', full_name: 'Илья Скаут 9', password: 'Scout9pass!' },
      { username: 'ilya_scout10', full_name: 'Илья Скаут 10', password: 'Scout10pass!' },
      { username: 'ilya_scout11', full_name: 'Илья Скаут 11', password: 'Scout11pass!' },
      { username: 'ilya_scout12', full_name: 'Илья Скаут 12', password: 'Scout12pass!' },
      { username: 'ilya_scout13', full_name: 'Илья Скаут 13', password: 'Scout13pass!' },
      { username: 'ilya_scout14', full_name: 'Илья Скаут 14', password: 'Scout14pass!' },
      { username: 'ilya_scout15', full_name: 'Илья Скаут 15', password: 'Scout15pass!' },
    ],
    6: [ // Rous Team
      { username: 'rous_scout1', full_name: 'Rous Скаут 1', password: 'Scout1pass!' },
      { username: 'rous_scout2', full_name: 'Rous Скаут 2', password: 'Scout2pass!' },
      { username: 'rous_scout3', full_name: 'Rous Скаут 3', password: 'Scout3pass!' },
      { username: 'rous_scout4', full_name: 'Rous Скаут 4', password: 'Scout4pass!' },
      { username: 'rous_scout5', full_name: 'Rous Скаут 5', password: 'Scout5pass!' },
      { username: 'rous_scout6', full_name: 'Rous Скаут 6', password: 'Scout6pass!' },
      { username: 'rous_scout7', full_name: 'Rous Скаут 7', password: 'Scout7pass!' },
      { username: 'rous_scout8', full_name: 'Rous Скаут 8', password: 'Scout8pass!' },
      { username: 'rous_scout9', full_name: 'Rous Скаут 9', password: 'Scout9pass!' },
      { username: 'rous_scout10', full_name: 'Rous Скаут 10', password: 'Scout10pass!' },
      { username: 'rous_scout11', full_name: 'Rous Скаут 11', password: 'Scout11pass!' },
      { username: 'rous_scout12', full_name: 'Rous Скаут 12', password: 'Scout12pass!' },
      { username: 'rous_scout13', full_name: 'Rous Скаут 13', password: 'Scout13pass!' },
      { username: 'rous_scout14', full_name: 'Rous Скаут 14', password: 'Scout14pass!' },
      { username: 'rous_scout15', full_name: 'Rous Скаут 15', password: 'Scout15pass!' },
    ],
    7: [ // Woman Team
      { username: 'woman_scout1', full_name: 'Woman Скаут 1', password: 'Scout1pass!' },
      { username: 'woman_scout2', full_name: 'Woman Скаут 2', password: 'Scout2pass!' },
      { username: 'woman_scout3', full_name: 'Woman Скаут 3', password: 'Scout3pass!' },
      { username: 'woman_scout4', full_name: 'Woman Скаут 4', password: 'Scout4pass!' },
      { username: 'woman_scout5', full_name: 'Woman Скаут 5', password: 'Scout5pass!' },
      { username: 'woman_scout6', full_name: 'Woman Скаут 6', password: 'Scout6pass!' },
      { username: 'woman_scout7', full_name: 'Woman Скаут 7', password: 'Scout7pass!' },
      { username: 'woman_scout8', full_name: 'Woman Скаут 8', password: 'Scout8pass!' },
      { username: 'woman_scout9', full_name: 'Woman Скаут 9', password: 'Scout9pass!' },
      { username: 'woman_scout10', full_name: 'Woman Скаут 10', password: 'Scout10pass!' },
      { username: 'woman_scout11', full_name: 'Woman Скаут 11', password: 'Scout11pass!' },
      { username: 'woman_scout12', full_name: 'Woman Скаут 12', password: 'Scout12pass!' },
      { username: 'woman_scout13', full_name: 'Woman Скаут 13', password: 'Scout13pass!' },
      { username: 'woman_scout14', full_name: 'Woman Скаут 14', password: 'Scout14pass!' },
      { username: 'woman_scout15', full_name: 'Woman Скаут 15', password: 'Scout15pass!' },
    ],
  };

  let created = 0;
  for (const [teamId, users] of Object.entries(usersByTeam)) {
    for (const u of users) {
      const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
      if (exists) { console.log(`SKIP: ${u.username} already exists`); continue; }
      const hash = bcrypt.hashSync(u.password, 10);
      db.prepare('INSERT INTO users (username, password_hash, full_name, role, squad_id, team_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(u.username, hash, u.full_name, 'scout', SQUAD_ID, parseInt(teamId));
      created++;
    }
  }

  // Force save
  const { saveDatabase } = require('./server/database');
  saveDatabase();
  console.log(`Created ${created} users. Total: ${db.prepare('SELECT COUNT(*) as c FROM users').get().c}`);
});
