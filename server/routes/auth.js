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
  try {
    const subscription = req.body;
    
    // Проверка структуры пришедшего объекта
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "Некорректный формат подписки" });
    }

    const userId = parseInt(req.user.id);
    if (isNaN(userId)) {
      return res.status(401).json({ error: "Невалидный ID пользователя" });
    }

    // Сохраняем или обновляем подписку
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: userId
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: userId
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Push Subscribe Error:", err);
    res.status(500).json({ error: "Ошибка сервера при подписке" });
  }
});

module.exports = router;