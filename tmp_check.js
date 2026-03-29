const m = require('./server/database');
m.initDatabase().then(() => {
  const db = m.getDb();
  console.log('USERS:', JSON.stringify(db.prepare('SELECT id, username, full_name, role, squad_id, team_id FROM users').all()));
  console.log('SQUADS:', JSON.stringify(db.prepare('SELECT * FROM squads').all()));
  console.log('TEAMS:', JSON.stringify(db.prepare('SELECT * FROM teams').all()));
});
