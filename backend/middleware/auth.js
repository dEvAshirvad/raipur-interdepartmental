const jwt = require('jsonwebtoken');
const db  = require('../database/db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(payload.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated or does not exist.' });
    }

    req.user = {
      id:       payload.id,
      username: payload.username,
      role:     payload.role,
      dept_id:  payload.dept_id
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
