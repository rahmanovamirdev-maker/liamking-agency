const { initDatabase, getDb, saveDatabase } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDatabase();
  const db = getDb();
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  console.log('Создаём тестовых пользователей...');

  // --- Сквады ---
  db.prepare('INSERT OR IGNORE INTO squads (id, name) VALUES (?, ?)').run(1, 'Alpha Squad');
  db.prepare('INSERT OR IGNORE INTO squads (id, name) VALUES (?, ?)').run(2, 'Beta Squad');
  db.prepare('INSERT OR IGNORE INTO squads (id, name) VALUES (?, ?)').run(3, 'Gamma Squad');

  // --- Пользователи ---
  const users = [
    // Админы скводов
    { id: 2, username: 'admin1', pw: 'admin123', name: 'Алексей Смирнов', role: 'admin', squad: 1 },
    { id: 3, username: 'admin2', pw: 'admin123', name: 'Дмитрий Козлов', role: 'admin', squad: 2 },
    // Кураторы
    { id: 4, username: 'curator1', pw: 'admin123', name: 'Ольга Петрова', role: 'curator', squad: 1 },
    { id: 5, username: 'curator2', pw: 'admin123', name: 'Наталья Волкова', role: 'curator', squad: 2 },
    // HR
    { id: 6, username: 'hr1', pw: 'admin123', name: 'Елена Иванова', role: 'hr', squad: 1 },
    { id: 7, username: 'hr2', pw: 'admin123', name: 'Мария Соколова', role: 'hr', squad: 2 },
    // Скауты
    { id: 8, username: 'scout1', pw: 'admin123', name: 'Иван Кузнецов', role: 'scout', squad: 1 },
    { id: 9, username: 'scout2', pw: 'admin123', name: 'Пётр Новиков', role: 'scout', squad: 1 },
    { id: 10, username: 'scout3', pw: 'admin123', name: 'Сергей Морозов', role: 'scout', squad: 2 },
    { id: 11, username: 'scout4', pw: 'admin123', name: 'Андрей Лебедев', role: 'scout', squad: 2 },
    { id: 12, username: 'scout5', pw: 'admin123', name: 'Максим Федоров', role: 'scout', squad: 3 },
    // Мульти-роль: админ + куратор
    { id: 13, username: 'multi1', pw: 'admin123', name: 'Артём Власов', role: 'admin,curator', squad: 3 },
  ];

  for (const u of users) {
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(u.id);
    if (!exists) {
      db.prepare('INSERT INTO users (id, username, password_hash, full_name, role, squad_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(u.id, u.username, hash(u.pw), u.name, u.role, u.squad);
    }
  }

  // Привязываем админов к сквадам
  db.prepare('UPDATE squads SET admin_id = 2 WHERE id = 1').run();
  db.prepare('UPDATE squads SET admin_id = 3 WHERE id = 2').run();

  // --- Команды ---
  const teams = [
    { id: 1, name: 'Alpha-1', squad: 1, leader: 8 },
    { id: 2, name: 'Alpha-2', squad: 1, leader: 9 },
    { id: 3, name: 'Beta-1', squad: 2, leader: 10 },
    { id: 4, name: 'Beta-2', squad: 2, leader: 11 },
  ];

  for (const t of teams) {
    const exists = db.prepare('SELECT id FROM teams WHERE id = ?').get(t.id);
    if (!exists) {
      db.prepare('INSERT INTO teams (id, name, squad_id, leader_id) VALUES (?, ?, ?, ?)').run(t.id, t.name, t.squad, t.leader);
    }
  }

  // Привязка скаутов к командам
  db.prepare('UPDATE users SET team_id = 1 WHERE id = 8').run();
  db.prepare('UPDATE users SET team_id = 2 WHERE id = 9').run();
  db.prepare('UPDATE users SET team_id = 3 WHERE id = 10').run();
  db.prepare('UPDATE users SET team_id = 4 WHERE id = 11').run();

  console.log('Создаём тестовые анкеты...');

  // --- Анкеты MODEL ---
  const modelApps = [
    { name: 'Анна Белова', phone: '+7 900 111-22-33', telegram: '@annabelova', age: '23', intro_name: 'HR агентства', vacancy_title: 'Webcam модель', languages: 'Русский, Английский', intro_role: 'HR менеджер', info: 'Опытная, уверена в себе', scout: 8, squad: 1, status: 'pending_review' },
    { name: 'Вера Данилова', phone: '+7 900 333-44-55', telegram: '@veradanilova', age: '21', intro_name: 'Рекрутер', vacancy_title: 'Модель чат', languages: 'Русский', intro_role: 'Рекрутер', info: 'Ищет подработку', scout: 10, squad: 2, status: 'pending_review' },
    { name: 'Диана Жукова', phone: '+7 900 555-66-77', telegram: '@dianazhukova', age: '22', intro_name: 'HR студия', vacancy_title: 'Фотомодель', languages: 'Русский, Испанский', intro_role: 'Менеджер проекта', info: 'Ранее работала моделью', scout: 10, squad: 2, status: 'reviewed', admin: 3 },
    { name: 'Жанна Калинина', phone: '+7 900 777-88-99', telegram: '@zhannakk', age: '24', intro_name: 'Менеджер', vacancy_title: 'Webcam модель', languages: 'Русский, Английский, Немецкий', intro_role: 'Координатор', info: 'Есть опыт в сфере', scout: 11, squad: 2, status: 'interviewing', admin: 3, curator: 5 },
    { name: 'Ирина Михайлова', phone: '+7 900 999-00-11', telegram: '@irinamikh', age: '29', intro_name: 'Директор', vacancy_title: 'Модель чат', languages: 'Русский', intro_role: 'Директор студии', info: '', scout: 10, squad: 2, status: 'interviewing', admin: 3, curator: 5 },
    { name: 'Лариса Орлова', phone: '+7 901 222-33-44', telegram: '@larisaor', age: '25', intro_name: 'HR', vacancy_title: 'Webcam модель', languages: 'Русский, Английский', intro_role: 'HR', info: 'Прошла собеседование успешно', scout: 11, squad: 2, status: 'registering', admin: 3, curator: 5, hr: 7 },
    { name: 'Светлана Фёдорова', phone: '+7 901 888-99-00', telegram: '@svetafed', age: '20', intro_name: 'Рекрутер', vacancy_title: 'Модель', languages: 'Русский', intro_role: 'Рекрутер', info: '', scout: 12, squad: 3, status: 'rejected', rejection: 'Несоответствие требованиям по возрасту' },
  ];

  // --- Анкеты OPERATOR ---
  const operatorApps = [
    { name: 'Борис Чернов', phone: '+7 900 222-33-44', telegram: '@borischernov', age: '28', company: 'IT Solutions', english: 'B2', experience: '3 года в поддержке', pc: 'i7 12700, RTX 3060, 100 Мбит', scout: 9, squad: 1, status: 'pending_review' },
    { name: 'Георгий Егоров', phone: '+7 900 444-55-66', telegram: '@georgyegorov', age: '25', company: 'WebStudio', english: 'B1', experience: '1 год оператором', pc: 'Ryzen 5 5600, GTX 1660, 50 Мбит', scout: 8, squad: 1, status: 'pending_review' },
    { name: 'Евгений Зайцев', phone: '+7 900 666-77-88', telegram: '@evgenyz', age: '27', company: 'MediaGroup', english: 'C1', experience: '5 лет в IT', pc: 'i9 13900, RTX 4090, 500 Мбит', scout: 9, squad: 1, status: 'reviewed', admin: 2 },
    { name: 'Захар Ларионов', phone: '+7 900 888-99-00', telegram: '@zaharlar', age: '26', company: 'Freelance', english: 'A2', experience: 'Без опыта', pc: 'Ryzen 3, 16GB RAM, 30 Мбит', scout: 8, squad: 1, status: 'interviewing', admin: 2, curator: 4 },
    { name: 'Кирилл Николаев', phone: '+7 901 111-22-33', telegram: '@kirillnik', age: '23', company: 'TechCorp', english: 'B1', experience: '2 года оператором', pc: 'i5 11400, GTX 1650, 100 Мбит', scout: 9, squad: 1, status: 'no_show', admin: 2, curator: 4 },
    { name: 'Михаил Попов', phone: '+7 901 333-44-55', telegram: '@mikhailpop', age: '30', company: 'GameDev Ltd', english: 'C1', experience: '7 лет в IT', pc: 'i9 12900K, RTX 3080, 1 Гбит', scout: 8, squad: 1, status: 'registering', admin: 2, curator: 4, hr: 6 },
    { name: 'Руслан Ушаков', phone: '+7 901 777-88-99', telegram: '@ruslanush', age: '31', company: 'NoName', english: 'A1', experience: 'Нет', pc: 'Старый ноутбук', scout: 8, squad: 1, status: 'rejected', admin: 2, rejection: 'Не прошёл проверку' },
    { name: 'Олег Соловьёв', phone: '+7 901 555-66-77', telegram: '@olegsol', age: '27', company: 'DataCorp', english: 'B2', experience: '4 года', pc: 'Ryzen 7, RTX 3070, 200 Мбит', scout: 9, squad: 1, status: 'rejected', admin: 2, curator: 4, rejection: 'Не прошёл собеседование' },
  ];

  for (const a of modelApps) {
    const r = db.prepare(`
      INSERT INTO applications (app_type, candidate_name, candidate_phone, candidate_telegram, candidate_age, candidate_info,
        intro_name, vacancy_title, languages, intro_role, status, scout_id, admin_id, curator_id, hr_id, squad_id, rejection_reason)
      VALUES ('model', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(a.name, a.phone, a.telegram, a.age, a.info, a.intro_name, a.vacancy_title, a.languages, a.intro_role,
      a.status, a.scout, a.admin || null, a.curator || null, a.hr || null, a.squad, a.rejection || '');
    db.prepare('INSERT INTO application_history (application_id, old_status, new_status, changed_by, comment) VALUES (?, NULL, ?, ?, ?)')
      .run(r.lastInsertRowid, a.status, a.scout, 'Анкета создана');
  }

  for (const a of operatorApps) {
    const r = db.prepare(`
      INSERT INTO applications (app_type, candidate_name, candidate_phone, candidate_telegram, candidate_age,
        company_name, english_level, work_experience, pc_specs, status, scout_id, admin_id, curator_id, hr_id, squad_id, rejection_reason)
      VALUES ('operator', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(a.name, a.phone, a.telegram, a.age, a.company, a.english, a.experience, a.pc,
      a.status, a.scout, a.admin || null, a.curator || null, a.hr || null, a.squad, a.rejection || '');
    db.prepare('INSERT INTO application_history (application_id, old_status, new_status, changed_by, comment) VALUES (?, NULL, ?, ?, ?)')
      .run(r.lastInsertRowid, a.status, a.scout, 'Анкета создана');
  }

  console.log('Создаём тестовые лиды...');

  // --- Лиды (пул владельца + назначенные скаутам) ---
  const poolLeads = [
    { name: 'Алиса Громова', phone: '+7 905 100-20-30', telegram: '@alisagromova', source: 'Instagram' },
    { name: 'Тимур Хасанов', phone: '+7 905 200-30-40', telegram: '@timurhas', source: 'Telegram' },
    { name: 'Юлия Пономарёва', phone: '+7 905 300-40-50', telegram: '@yuliapon', source: 'Рекомендация' },
    { name: 'Артём Васильев', phone: '+7 905 400-50-60', telegram: '@artemvas', source: 'VK' },
    { name: 'Екатерина Степанова', phone: '+7 905 500-60-70', telegram: '@katestep', source: 'HeadHunter' },
    { name: 'Роман Григорьев', phone: '+7 905 600-70-80', telegram: '@romangrig', source: 'Instagram' },
    { name: 'Дарья Козлова', phone: '+7 905 700-80-90', telegram: '@daryakoz', source: 'Telegram' },
    { name: 'Николай Белов', phone: '+7 905 800-90-01', telegram: '@nikolayb', source: 'VK' },
    { name: 'Оксана Мартынова', phone: '+7 905 900-01-12', telegram: '@oksanam', source: 'Instagram' },
    { name: 'Виктор Семёнов', phone: '+7 906 100-20-30', telegram: '@victorsem', source: 'Рекомендация' },
  ];

  // Pool leads (unassigned, status: new)
  for (const l of poolLeads) {
    db.prepare('INSERT INTO leads (name, phone, telegram, source, status) VALUES (?, ?, ?, ?, ?)').run(l.name, l.phone, l.telegram, l.source, 'new');
  }

  // Assigned leads for scouts
  const assignedLeads = [
    { name: 'Полина Сидорова', phone: '+7 906 200-30-40', telegram: '@polinasid', source: 'Instagram', status: 'in_progress', scout: 8 },
    { name: 'Максим Орлов', phone: '+7 906 300-40-50', telegram: '@maximor', source: 'Telegram', status: 'contacted', scout: 8 },
    { name: 'Елена Титова', phone: '+7 906 400-50-60', telegram: '@elenatit', source: 'VK', status: 'refused', scout: 9 },
    { name: 'Денис Крылов', phone: '+7 906 500-60-70', telegram: '@deniskr', source: 'HeadHunter', status: 'processed', scout: 10 },
    { name: 'Анастасия Медведева', phone: '+7 906 600-70-80', telegram: '@nastamed', source: 'Telegram', status: 'ignored', scout: 11 },
  ];

  for (const l of assignedLeads) {
    db.prepare('INSERT INTO leads (name, phone, telegram, source, status, scout_id, assigned_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))')
      .run(l.name, l.phone, l.telegram, l.source, l.status, l.scout);
  }

  // --- Lead requests ---
  db.prepare(`INSERT INTO lead_requests (scout_id, admin_id, requested_count, approved_count, status, comment) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(8, 2, 5, 3, 'approved', 'Одобрено 3 из 5');
  db.prepare(`INSERT INTO lead_requests (scout_id, admin_id, requested_count, approved_count, status, comment) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(9, 2, 10, 0, 'pending', '');

  console.log('Создаём тестовые посты...');

  // --- Посты ---
  db.prepare(`INSERT INTO posts (title, content, author_id, is_pinned) VALUES (?, ?, ?, ?)`).run(
    '🚀 Запуск агентства LIAMKING',
    'Рады приветствовать всех участников! Наше агентство официально начинает работу. Желаем всем продуктивной работы и высоких результатов!\n\nОсновные правила:\n1. Все анкеты подаются через систему\n2. Следите за статусами своих кандидатов\n3. Общайтесь с кураторами при возникновении вопросов',
    1, 1
  );

  db.prepare(`INSERT INTO posts (title, content, author_id, is_pinned) VALUES (?, ?, ?, ?)`).run(
    '📊 Результаты за первую неделю',
    'Подводим итоги первой рабочей недели:\n- Подано 17 анкет\n- 2 кандидата уже работают\n- Лид-база растёт\n\nЛучший скаут недели — Иван Кузнецов! Поздравляем! 🎉',
    1, 0
  );

  db.prepare(`INSERT INTO posts (title, content, author_id, is_pinned) VALUES (?, ?, ?, ?)`).run(
    '📋 Обновление правил подачи анкет',
    'Уважаемые скауты! Напоминаем, что в анкете обязательно нужно заполнять:\n- Полное имя кандидата\n- Номер телефона\n- Город\n- Возраст\n\nАнкеты без этих данных будут возвращены на доработку.',
    1, 0
  );

  // Комментарии
  db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(1, 8, 'Отлично! Уже начинаю работу 💪');
  db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(1, 4, 'Добро пожаловать всем! Обращайтесь если нужна помощь.');
  db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(2, 9, 'Поздравляю Ивана! Заслуженно!');
  db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(2, 10, 'В следующую неделю обгоню 😄');

  console.log('Создаём уведомления...');

  // --- Уведомления ---
  db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)').run(1, 'system', 'Система запущена', 'Агентство LIAMKING успешно запущено', 0);
  db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)').run(2, 'new_application', 'Новая анкета', 'Скаут Иван Кузнецов подал анкету: Анна Белова', 0);
  db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)').run(4, 'status_change', 'Новая анкета для собеседования', 'Вам назначена анкета: Евгений Зайцев', 0);
  db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)').run(6, 'status_change', 'Кандидат для регистрации', 'Новый кандидат для регистрации: Кирилл Николаев', 0);
  db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)').run(8, 'status_change', 'Кандидат зарегистрирован', 'Михаил Попов успешно зарегистрирован!', 1);
  db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, ?)').run(8, 'status_change', 'Анкета отклонена', 'Анкета "Руслан Ушаков" отклонена', 0);

  saveDatabase();
  console.log('\n✅ Тестовые данные успешно созданы!\n');
  console.log('Пользователи (пароль у всех: admin123):');
  console.log('  owner    — Владелец');
  console.log('  admin1   — Админ Alpha Squad');
  console.log('  admin2   — Админ Beta Squad');
  console.log('  curator1 — Куратор Alpha');
  console.log('  curator2 — Куратор Beta');
  console.log('  hr1      — HR Alpha');
  console.log('  hr2      — HR Beta');
  console.log('  scout1-5 — Скауты');
  console.log('\nАнкеты: 15 шт (7 модель + 8 оператор)');
  console.log('Лиды: 15 шт (10 в пуле + 5 назначенных)');
  console.log('Запросы лидов: 2 шт');
  console.log('Посты: 3 шт');

  process.exit(0);
}

seed().catch(err => { console.error('Ошибка:', err); process.exit(1); });
