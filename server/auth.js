const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Данные пользователя (id, role) теперь доступны в req.user
    next();
  } catch (err) {
    res.status(401).json({ error: 'Токен не валиден' });
  }
};

// Проверка ролей (например: authorize('ADMIN'))
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Нет доступа к этому разделу' });
    }
    next();
  };
};

module.exports = { protect, authorize };