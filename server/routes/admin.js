// server/routes/admin.js
const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { protect, authorize } = require('../auth');
const { 
  startPairing, 
  stopPairing, 
  isPairing, 
  checkBotStatus, 
  leaveCurrentGroup, 
  sendToGroup 
} = require('../telegram');

// Все роуты здесь защищены: только для ADMIN
router.use(protect, authorize('ADMIN'));

// --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ---

router.get('/users', async (req, res) => {
  const activeUsers = req.app.get('activeUsers');
  try {
    const users = await prisma.user.findMany({
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const usersWithStatus = users.map(user => ({
      ...user,
      isOnline: activeUsers.has(user.id)
    }));

    res.json(usersWithStatus);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.json(user);
  } catch (err) { res.status(500).json({ error: "Ошибка создания пользователя" }); }
});

router.patch('/users/:id', async (req, res) => {
  const { password, ...data } = req.body;
  if (password && password.trim() !== "") data.password = password;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(user);
  } catch (err) { res.status(500).json({ error: "Ошибка обновления" }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Ошибка удаления" }); }
});

// --- УПРАВЛЕНИЕ КАНАЛАМИ ---

router.post('/channels', async (req, res) => {
  try {
    const channel = await prisma.channel.create({ 
      data: { 
        name: req.body.name,
        showOriginalLink: true,
        titlePrefix: "",
        descriptionFooter: "",
        originalLinkPrefix: "CREDIT - "
      } 
    });
    res.json(channel);
  } catch (err) { res.status(500).json({ error: "Ошибка создания канала" }); }
});

router.patch('/channels/:id', async (req, res) => {
  try {
    const channel = await prisma.channel.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(channel);
  } catch (err) { res.status(500).json({ error: "Ошибка обновления канала" }); }
});

router.delete('/channels/:id', async (req, res) => {
  try {
    await prisma.channel.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Ошибка удаления" }); }
});

// --- НАСТРОЙКИ (PROXY & TELEGRAM) ---

router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    res.json(settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/settings', async (req, res) => {
  const { key, value } = req.body;
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    // Если обновили прокси, меняем его в текущем процессе
    if (key === 'proxy_url') process.env.PROXY_URL = value;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Ошибка сохранения" }); }
});

// Telegram: Статус
router.get('/tg-status', async (req, res) => {
  const status = await checkBotStatus();
  res.json({ ...status, isPairing: isPairing() });
});

// Telegram: Начать привязку
router.post('/tg-start-pairing', async (req, res) => {
  const result = await startPairing();
  if (result.success) res.json({ success: true });
  else res.status(500).json({ error: result.error });
});

// Telegram: Сброс группы
router.post('/tg-reset', async (req, res) => {
  try {
    await leaveCurrentGroup();
    await prisma.setting.delete({ where: { key: 'tg_group_id' } });
    res.json({ success: true });
  } catch (err) { res.json({ success: true }); }
});

// Telegram: Тестовое сообщение
router.post('/tg-test', async (req, res) => {
  try {
    await sendToGroup("🔔 <b>Тестовое уведомление</b>\nСвязь с Clipsio установлена успешно!");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;