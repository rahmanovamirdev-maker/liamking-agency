const m = require('./server/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

m.initDatabase().then(() => {
  const db = m.getDb();
  
  const SQUAD_ID = 2; // Danil Squad
  const TEAMS = {
    danil: 3,   // Данил Team
    ilya: 4,    // Илья Team
    rous: 6,    // Rous Team
    woman: 7    // Woman Team
  };

  function genPass() {
    return crypto.randomBytes(4).toString('hex'); // 8 char hex password
  }

  const results = [];

  function createUser(username, fullName, role, teamId, isLeader) {
    const password = genPass();
    const hash = bcrypt.hashSync(password, 10);
    
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      results.push({ username, fullName, password: 'ALREADY EXISTS', role, team: teamId });
      return existing.id;
    }
    
    const r = db.prepare('INSERT INTO users (username, password_hash, full_name, role, squad_id, team_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      username, hash, fullName, role, SQUAD_ID, teamId
    );
    const userId = r.lastInsertRowid;
    results.push({ username, fullName, password, role, team: teamId, id: userId });
    
    if (isLeader && teamId) {
      db.prepare('UPDATE teams SET leader_id = ? WHERE id = ?').run(userId, teamId);
    }
    
    return userId;
  }

  // === Данил Team (ID 3) ===
  createUser('Uxfyh', 'Данил', 'admin', TEAMS.danil, true);
  createUser('quincyymeow', 'Кирюша', 'scout', TEAMS.danil, false);
  createUser('Lucky_HRR', 'Lucky', 'scout', TEAMS.danil, false);
  createUser('Camel', 'Camel', 'scout', TEAMS.danil, false);
  createUser('Nkrt5', 'HZ', 'scout', TEAMS.danil, false);
  createUser('dianakisc', 'DianaKisc', 'scout', TEAMS.danil, false);
  createUser('preFerms', 'ProGect', 'scout', TEAMS.danil, false);
  createUser('ProgarsoX', 'ProfileInfo', 'scout', TEAMS.danil, false);
  createUser('YanixqM', 'Пиздюк', 'scout', TEAMS.danil, false);
  createUser('x9ijeeee', 'X9ije', 'scout', TEAMS.danil, false);
  createUser('fg_andyha', 'Андрей', 'scout', TEAMS.danil, false);
  createUser('lovetrentwins', 'Toyxi', 'scout', TEAMS.danil, false);
  createUser('Delerikk', 'Deleriks', 'scout', TEAMS.danil, false);
  createUser('Rinxx69', 'Rinix', 'scout', TEAMS.danil, false);
  createUser('sflaa', 'sflaa', 'scout', TEAMS.danil, false);
  createUser('zyrmorthalis', 'Иван', 'scout', TEAMS.danil, false);
  createUser('Kentikgg', 'Костик', 'scout', TEAMS.danil, false);
  createUser('Monk161', 'Монк', 'scout', TEAMS.danil, false);
  createUser('Martonizm', 'Мерен', 'scout', TEAMS.danil, false);
  createUser('cvv342', 'Максим', 'scout', TEAMS.danil, false);
  createUser('hempsey', 'Hepsey', 'scout', TEAMS.danil, false);

  // === Илья Team (ID 4) ===
  createUser('zona1365', 'Илья', 'admin', TEAMS.ilya, true);
  createUser('iammakatao', 'iammakatao', 'scout', TEAMS.ilya, false);
  createUser('jewelrydealer', 'jewelrydealer', 'scout', TEAMS.ilya, false);
  createUser('themothmannn', 'themothmannn', 'scout', TEAMS.ilya, false);
  createUser('Skau700', 'Skau700', 'scout', TEAMS.ilya, false);
  createUser('yebiwiehh_0', 'yebiwiehh_0', 'scout', TEAMS.ilya, false);
  createUser('endsdxsz', 'endsdxsz', 'scout', TEAMS.ilya, false);
  createUser('Who_am1q', 'Who_am1q', 'scout', TEAMS.ilya, false);
  createUser('burgerkoin1', 'burgerkoin1', 'scout', TEAMS.ilya, false);
  createUser('Potuzna', 'Potuzna', 'scout', TEAMS.ilya, false);
  createUser('ghressss', 'ghressss', 'scout', TEAMS.ilya, false);
  createUser('zhanuse4ka', 'zhanuse4ka', 'scout', TEAMS.ilya, false);
  createUser('andron1211', 'andron1211', 'scout', TEAMS.ilya, false);
  createUser('mrMaksutka', 'mrMaksutka', 'scout', TEAMS.ilya, false);
  createUser('RyzeLox', 'RyzeLox', 'scout', TEAMS.ilya, false);
  createUser('daniilkarpenkoo', 'daniilkarpenkoo', 'scout', TEAMS.ilya, false);
  createUser('spcopap', 'spcopap', 'scout', TEAMS.ilya, false);
  createUser('EvkNnnn', 'EvkNnnn', 'scout', TEAMS.ilya, false);
  createUser('flex_seks', 'flex_seks', 'scout', TEAMS.ilya, false);
  createUser('Chebur098', 'Chebur098', 'scout', TEAMS.ilya, false);
  createUser('glavstroy7777', 'glavstroy7777', 'scout', TEAMS.ilya, false);
  createUser('detochka2000', 'detochka2000', 'scout', TEAMS.ilya, false);
  createUser('I_nikto_blya', 'I_nikto_blya', 'scout', TEAMS.ilya, false);
  createUser('xcwwsd', 'xcwwsd', 'scout', TEAMS.ilya, false);
  createUser('vse_ssmm', 'vse_ssmm', 'scout', TEAMS.ilya, false);
  createUser('Qepcyc', 'Qepcyc', 'scout', TEAMS.ilya, false);
  createUser('senllov', 'senllov', 'scout', TEAMS.ilya, false);
  createUser('indarusix', 'indarusix', 'scout', TEAMS.ilya, false);
  createUser('chapmenq', 'chapmenq', 'scout', TEAMS.ilya, false);

  // === Rous Team (ID 6) ===
  createUser('Rouserp', 'Гриша', 'admin', TEAMS.rous, true);
  createUser('lskdbdaru', 'lskdbdaru', 'scout', TEAMS.rous, false);
  createUser('frol1k', 'frol1k', 'scout', TEAMS.rous, false);
  createUser('graliksonCEO', 'Боря', 'scout', TEAMS.rous, false);

  // === Woman Team (ID 7) — без лидера ===
  createUser('notevenghost', 'Полина', 'scout', TEAMS.woman, false);
  createUser('romashka1_16', 'Ромашка', 'scout', TEAMS.woman, false);
  createUser('kerwieska', 'kerwieska', 'scout', TEAMS.woman, false);
  createUser('riphmastt', 'Катя', 'scout', TEAMS.woman, false);
  createUser('avosinahelas', 'Влада', 'scout', TEAMS.woman, false);
  createUser('polika_cherez', 'Полина 2', 'scout', TEAMS.woman, false);

  m.saveDatabase();

  console.log('\n=== CREATED USERS ===');
  console.log('Login | Full Name | Password | Role | Team');
  console.log('-------------------------------------------');
  results.forEach(r => {
    const teamName = r.team === TEAMS.danil ? 'Данил Team' : 
                     r.team === TEAMS.ilya ? 'Илья Team' : 
                     r.team === TEAMS.rous ? 'Rous Team' : 'Woman Team';
    console.log(`${r.username} | ${r.fullName} | ${r.password} | ${r.role} | ${teamName}`);
  });
  console.log(`\nTotal: ${results.length} users`);
});
