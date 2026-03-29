const m = require('./server/database');
m.initDatabase().then(() => {
  const db = m.getDb();
  console.log(db.prepare('SELECT COUNT(*) as cnt FROM users').get());
});
