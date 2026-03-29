const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretPath = path.join(__dirname, '..', '..', 'data', '.jwt_secret');
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(64).toString('hex');
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(secretPath, secret);
    return secret;
  }
}

const JWT_SECRET = getJwtSecret();

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Refresh role and check is_active from DB
    const { getDb } = require('../database');
    const db = getDb();
    const freshUser = db.prepare('SELECT role, is_active, full_name, squad_id, team_id FROM users WHERE id = ?').get(decoded.id);
    if (!freshUser || !freshUser.is_active) {
      return res.status(401).json({ error: 'Аккаунт деактивирован' });
    }
    decoded.role = freshUser.role;
    decoded.full_name = freshUser.full_name;
    decoded.squad_id = freshUser.squad_id || null;
    decoded.team_id = freshUser.team_id || null;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Check if user has at least one of the given roles
function userHasRole(user, ...roles) {
  if (!user || !user.role) return false;
  const userRoles = user.role.split(',');
  return roles.some(r => userRoles.includes(r));
}

function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }
    if (roles.length > 0 && !userHasRole(req.user, ...roles)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

module.exports = { authMiddleware, roleMiddleware, JWT_SECRET, userHasRole };
