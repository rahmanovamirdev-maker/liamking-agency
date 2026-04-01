const { initDatabase, getDb, logAction, saveDatabase } = require('./server/database');

async function main() {
  await initDatabase();
  const db = getDb();

  // Test logAction directly  
  console.log('Before insert:');
  console.log('Count:', db.prepare("SELECT COUNT(*) as cnt FROM logs").get());
  
  // Call logAction the same way routes do
  logAction(1, 'test_action', 'Test from script', '127.0.0.1');
  
  console.log('After insert:');
  console.log('Count:', db.prepare("SELECT COUNT(*) as cnt FROM logs").get());
  
  const last = db.prepare("SELECT * FROM logs ORDER BY id DESC LIMIT 3").all();
  console.log('Last logs:', JSON.stringify(last, null, 2));
  
  saveDatabase();
  console.log('Saved to disk');
}

main().catch(console.error);
