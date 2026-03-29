const m = require('./server/database');
m.initDatabase().then(() => {
  const db = m.getDb();
  console.log('SQUADS:', JSON.stringify(db.prepare('SELECT * FROM squads').all()));
  console.log('TEAMS:', JSON.stringify(db.prepare('SELECT * FROM teams').all()));
  console.log('USERS:', JSON.stringify(db.prepare('SELECT id,username,full_name,role FROM users').all()));
});
