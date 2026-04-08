// server/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { protect } = require('../auth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/subscribe', protect, async (req, res) => {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys) {
    return res.status(400).json({ error: "Неверный формат подписки" });
  }

  try {
    // Сохраняем подписку. Если endpoint уже есть — обновляем владельца
    await prisma.pushSubscription.upsert({
      where: { endpoint: endpoint },
      update: { 
        userId: req.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth
      },
      create: { 
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.user.id
      }
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB Save Error:", err);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

module.exports = router;