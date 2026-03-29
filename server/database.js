const initSqlJs = require('sql.js');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'agency.db');

let _db = null;
let _SQL = null;

// Wrapper to make sql.js API compatible with better-sqlite3 style
class DbWrapper {
  constructor(db) { this._db = db; }

  prepare(sql) {
    const db = this._db;
    // Sanitize params: convert undefined to null to prevent sql.js errors
    const sanitize = (params) => params.map(p => p === undefined ? null : p);
    return {
      run(...params) {
        db.run(sql, sanitize(params));
        return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0, changes: db.getRowsModified() };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        try {
          if (params.length) stmt.bind(sanitize(params));
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const obj = {};
            cols.forEach((c, i) => obj[c] = vals[i]);
            stmt.free();
            return obj;
          }
          stmt.free();
          return undefined;
        } catch(e) {
          stmt.free();
          throw e;
        }
      },
      all(...params) {
        const stmt = db.prepare(sql);
        try {
          if (params.length) stmt.bind(sanitize(params));
          const results = [];
          const cols = stmt.getColumnNames();
          while (stmt.step()) {
            const vals = stmt.get();
            const obj = {};
            cols.forEach((c, i) => obj[c] = vals[i]);
            results.push(obj);
          }
          stmt.free();
          return results;
        } catch(e) {
          stmt.free();
          throw e;
        }
      }
    };
  }

  exec(sql) { this._db.run(sql); }
  close() { /* no-op, we keep the db open */ }

  pragma(str) {
    try { this._db.run(`PRAGMA ${str}`); } catch { /* ignore */ }
  }
}

async function initSql() {
  if (!_SQL) {
    _SQL = await initSqlJs();
  }
  return _SQL;
}

function saveDatabase() {
  if (!_db) return;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = _db._db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Auto-save every 5 seconds if changes were made
let _saveInterval = null;
function startAutoSave() {
  if (_saveInterval) return;
  _saveInterval = setInterval(() => {
    try { saveDatabase(); } catch { /* ignore */ }
  }, 5000);
}

function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDatabase() first.');
  return _db;
}

async function initDatabase() {
  const SQL = await initSql();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  _db = new DbWrapper(db);
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar TEXT DEFAULT NULL,
      about TEXT DEFAULT '',
      wallet TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'scout',
      squad_id INTEGER DEFAULT NULL,
      team_id INTEGER DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE SET NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS squads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      admin_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      squad_id INTEGER NOT NULL,
      leader_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE CASCADE,
      FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_type TEXT NOT NULL DEFAULT 'model' CHECK(app_type IN ('model','operator')),
      candidate_name TEXT NOT NULL,
      candidate_age TEXT DEFAULT '',
      candidate_phone TEXT DEFAULT '',
      candidate_telegram TEXT DEFAULT '',
      -- model fields
      intro_name TEXT DEFAULT '',
      vacancy_title TEXT DEFAULT '',
      languages TEXT DEFAULT '',
      intro_role TEXT DEFAULT '',
      candidate_info TEXT DEFAULT '',
      candidate_photo TEXT DEFAULT NULL,
      -- operator fields
      company_name TEXT DEFAULT '',
      english_level TEXT DEFAULT '',
      work_experience TEXT DEFAULT '',
      pc_specs TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending_review',
      direction TEXT DEFAULT NULL,
      scout_id INTEGER NOT NULL,
      admin_id INTEGER DEFAULT NULL,
      curator_id INTEGER DEFAULT NULL,
      hr_id INTEGER DEFAULT NULL,
      squad_id INTEGER DEFAULT NULL,
      rejection_reason TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scout_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES users(id),
      FOREIGN KEY (curator_id) REFERENCES users(id),
      FOREIGN KEY (hr_id) REFERENCES users(id),
      FOREIGN KEY (squad_id) REFERENCES squads(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS application_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      views INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      telegram TEXT DEFAULT '',
      source TEXT DEFAULT '',
      status TEXT DEFAULT 'new' CHECK(status IN ('new','in_progress','contacted','refused','ignored','processed')),
      touch_count INTEGER DEFAULT 0,
      scout_id INTEGER DEFAULT NULL,
      assigned_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scout_id) REFERENCES users(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS lead_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scout_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      requested_count INTEGER DEFAULT 0,
      approved_count INTEGER DEFAULT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      comment TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME DEFAULT NULL,
      FOREIGN KEY (scout_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS lead_touches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      touch_type TEXT DEFAULT 'call',
      comment TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      application_id INTEGER DEFAULT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS application_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT DEFAULT '',
      file_name TEXT DEFAULT NULL,
      file_path TEXT DEFAULT NULL,
      file_type TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes
  try {
    _db.exec("CREATE INDEX IF NOT EXISTS idx_app_messages_app ON application_messages(application_id)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_applications_scout ON applications(scout_id)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_applications_squad ON applications(squad_id)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_leads_scout ON leads(scout_id)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_lead_requests_scout ON lead_requests(scout_id)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_lead_requests_admin ON lead_requests(admin_id)");
    _db.exec("CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id)");
  } catch { /* indexes might already exist */ }

  // Create default owner if no users exist
  const userCount = _db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    _db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
      .run('owner', hash, 'Владелец', 'owner');
    console.log('Default owner created: username=owner, password=admin123');
  }

  saveDatabase();
  startAutoSave();
  console.log('Database initialized successfully');
}

module.exports = { getDb, initDatabase, saveDatabase };
