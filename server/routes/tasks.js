// server/routes/tasks.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const prisma = require('../db');
const { protect, authorize } = require('../auth');
const { downloadVideoBackground } = require('../downloader');
const { sendPushNotification } = require('../push');

const execPromise = util.promisify(exec);
const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// Хелпер для ID видео
const getYouTubeID = (url) => {
  const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
};

module.exports = (io) => {

  router.get('/creators', protect, async (req, res) => {
    try {
      const creators = await prisma.user.findMany({
        where: { role: 'CREATOR' },
        select: { id: true, username: true, tgUsername: true }
      });
      res.json(creators);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ИНФОРМАЦИЯ И СКАНОВАНИЕ (MANAGER) ---
  router.post('/fetch-info', protect, async (req, res) => {
    const { url, force, useProxy } = req.body;
    const videoId = getYouTubeID(url);
    if (!videoId) return res.status(400).json({ error: 'Некорректная ссылка на YouTube' });

    const proxySetting = await prisma.setting.findUnique({ where: { key: 'proxy_url' } });
    const proxyUrl = proxySetting ? proxySetting.value : process.env.PROXY_URL;
    const proxyFlag = (useProxy && proxyUrl) ? `--proxy "${proxyUrl}"` : '';
    const ytDlpPath = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

    try {
      let video = await prisma.originalVideo.findUnique({ where: { videoId } });
      let existingChannelIds = [];

      if (video) {
        const tasks = await prisma.task.findMany({ where: { originalVideoId: video.id }, select: { channelId: true } });
        existingChannelIds = tasks.map(t => t.channelId);
        const fileExists = video.filePath && fs.existsSync(video.filePath);

        if (video.status === 'TOO_LONG') return res.json({ ...video, existingChannelIds });
        if (video.status === 'READY' && fileExists && !force) return res.json({ ...video, existingChannelIds });

        video = await prisma.originalVideo.update({ where: { videoId }, data: { status: 'DOWNLOADING', errorMessage: null } });
      } else {
        video = await prisma.originalVideo.create({ data: { videoId, url, status: 'DOWNLOADING' } });
      }

      try {
        const { stdout } = await execPromise(`${ytDlpPath} ${proxyFlag} --dump-json --skip-download --no-warnings --no-playlist "${url}"`, { maxBuffer: 10 * 1024 * 1024 });
        const info = JSON.parse(stdout);

        if (info.duration > 180) {
          video = await prisma.originalVideo.update({ where: { videoId }, data: { title: info.title, duration: Math.round(info.duration), status: 'TOO_LONG', errorMessage: 'Видео длиннее 3 минут' } });
          return res.json({ ...video, existingChannelIds });
        }

        video = await prisma.originalVideo.update({ where: { videoId }, data: { title: info.title, duration: Math.round(info.duration) } });
        downloadVideoBackground(videoId, url, io, useProxy, video);
        res.json({ ...video, existingChannelIds });
      } catch (e) {
        const errorMsg = e.stderr || e.message;
        video = await prisma.originalVideo.update({ where: { videoId }, data: { status: 'ERROR', errorMessage: errorMsg } });
        res.json(video);
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // --- СОЗДАНИЕ ЗАДАЧ (BULK) ---
  router.post('/bulk', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    // Вытаскиваем массив tasks из тела запроса
    const { originalVideoId, tasks } = req.body;

    if (!originalVideoId || !tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Некорректные данные (отсутствует ID видео или массив задач)" });
    }

    try {
      const createdTasks = await Promise.all(tasks.map(async (t) => {
        // ПРОВЕРКА: каждое поле берется из объекта 't' (текущий элемент цикла)
        return prisma.task.create({
          data: {
            originalVideoId: parseInt(originalVideoId),
            channelId: parseInt(t.channelId),
            managerId: req.user.id,
            priority: 'normal',
            creatorId: t.creatorId ? parseInt(t.creatorId) : null,
            status: t.creatorId ? 'IN_PROGRESS' : 'AWAITING_REACTION',
            claimedAt: t.creatorId ? new Date() : null,
            // Исправляем здесь:
            deadline: t.deadline ? new Date(t.deadline) : null,
            scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
          },
          include: { channel: true, creator: true, originalVideo: true }
        });
      }));

      // Отправка Push-уведомлений (без await, чтобы не тормозить ответ)
      const { sendPushNotification } = require('../push');
      createdTasks.forEach(task => {
        if (task.creatorId) {
          sendPushNotification(task.creatorId, {
            title: "Новое задание!",
            message: `Для канала ${task.channel.name}`,
            url: "/creator"
          }).catch(e => console.log("[Push Log] Не удалось отправить пуш"));
        }
      });

      res.json({ success: true, count: createdTasks.length });
    } catch (err) {
      console.error("Критическая ошибка /tasks/bulk:", err);
      res.status(500).json({ error: "Ошибка сервера при создании задач" });
    }
  });

  // --- СПИСКИ ДЛЯ КРЕАТОРА ---
  router.post('/:id/abandon', protect, async (req, res) => {
    try {
      await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'AWAITING_REACTION', creatorId: null }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  router.get('/available', protect, async (req, res) => {
    const { skip = 0, take = 10, channelId } = req.query;
    const where = { status: 'AWAITING_REACTION' };
    if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);

    const tasks = await prisma.task.findMany({
      where, include: { originalVideo: true, channel: true },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip), take: parseInt(take)
    });
    res.json(tasks);
  });

  router.get('/my-work', protect, async (req, res) => {
    const { channelId } = req.query;
    const where = { status: 'IN_PROGRESS', creatorId: req.user.id };
    if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);

    const tasks = await prisma.task.findMany({ where, include: { originalVideo: true, channel: true }, orderBy: { updatedAt: 'desc' } });
    res.json(tasks);
  });

  router.get('/history', protect, async (req, res) => {
    const { skip = 0, take = 10, channelId } = req.query;
    const where = { creatorId: req.user.id, status: { in: ['REACTION_UPLOADED', 'PUBLISHED'] } };
    if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);

    const tasks = await prisma.task.findMany({
      where, include: { originalVideo: true, channel: true },
      orderBy: { updatedAt: 'desc' },
      skip: parseInt(skip), take: parseInt(take)
    });
    res.json(tasks);
  });

  // --- СПИСКИ ДЛЯ МЕНЕДЖЕРА ---
  router.get('/managed', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    const { skip = 0, take = 10, tab, channelId } = req.query;
    const where = { managerId: req.user.id };
    if (tab === 'active') where.status = { not: 'PUBLISHED' };
    else if (tab === 'published') where.status = 'PUBLISHED';
    if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);

    const tasks = await prisma.task.findMany({
      where, include: { originalVideo: true, channel: true, creator: true },
      orderBy: { updatedAt: 'desc' },
      skip: parseInt(skip), take: parseInt(take)
    });
    res.json(tasks);
  });

  // --- ДЕЙСТВИЯ С ЗАДАЧАМИ ---
  router.get('/download-file', async (req, res) => {
    // Убедитесь, что достаете из req.query!
    const { path: filePath, token, name } = req.query; 

    try {
      const jwt = require('jsonwebtoken');
      // Проверяем токен из ссылки
      jwt.verify(token, process.env.JWT_SECRET);

      const path = require('path');
      const fullPath = path.resolve(process.cwd(), filePath);

      if (fs.existsSync(fullPath)) {
        // КРИТИЧНО ДЛЯ iOS: ставим эти заголовки
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name || 'video.mp4')}"`);
        
        fs.createReadStream(fullPath).pipe(res);
      } else {
        res.status(404).send("Файл не найден на сервере");
      }
    } catch (err) {
      res.status(401).send("Сессия истекла, обновите страницу в Clipsio");
    }
  });

  router.post('/:id/claim', protect, async (req, res) => {
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'IN_PROGRESS', creatorId: req.user.id, claimedAt: new Date() }
    });
    res.json(task);
  });

  router.post('/:id/upload', protect, upload.single('video'), async (req, res) => {
    try {
      const updatedTask = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'REACTION_UPLOADED', reactionFilePath: req.file.path.replace(/\\/g, '/'), reactionUploadedAt: new Date(), needsFixing: false },
        include: { channel: true }
      });

      const staff = await prisma.user.findMany({ 
        where: { role: { in: ['MANAGER', 'ADMIN'] } },
        select: { id: true }
      });

      staff.forEach(s => {
        sendPushNotification(s.id, {
          title: "Реакция готова ✅",
          message: `${req.user.username} сдал видео. Можно публиковать!`,
          url: "/manager"
        });
      });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/:id/reject', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    const { reason } = req.body;
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'IN_PROGRESS', needsFixing: true, rejectionReason: reason },
      include: { creator: true, channel: true }
    });
    sendPushNotification(task.creatorId, {
      title: "Нужны правки ⚠️",
      message: `Видео по каналу ${task.channel.name} отклонено: ${reason}`,
      url: "/creator"
    });
    res.json({ success: true });
  });

  router.post('/:id/publish', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    const { youtubeUrl, scheduledAt } = req.body;
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PUBLISHED', youtubeUrl, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, publishedAt: new Date(), uploaderId: req.user.id },
      include: { originalVideo: true }
    });
    sendPushNotification(task.creatorId, {
      title: "Видео опубликовано! 🎉",
      message: `Ваша работа по видео "${task.originalVideo.title}" уже на YouTube.`,
      url: "/creator"
    });
    res.json({ success: true });
  });

  router.patch('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    const { deadline, scheduledAt, creatorId } = req.body;
    const data = {
      deadline: deadline ? new Date(deadline) : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      creatorId: creatorId ? parseInt(creatorId) : null,
      status: creatorId ? 'IN_PROGRESS' : 'AWAITING_REACTION'
    };
    res.json(await prisma.task.update({ where: { id: parseInt(req.params.id) }, data }));
  });

  router.delete('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    res.json(await prisma.task.delete({ where: { id: parseInt(req.params.id) } }));
  });

  // --- ДОПОЛНИТЕЛЬНО ---
  router.get('/alerts-status', protect, async (req, res) => {
    const now = new Date();
    try {
      const my = await prisma.task.count({ where: { creatorId: req.user.id, status: 'IN_PROGRESS', OR: [{ deadline: { lt: now } }, { needsFixing: true }] } });
      const available = await prisma.task.count({ where: { status: 'AWAITING_REACTION', deadline: { lt: now } } });
      const history = await prisma.task.count({ where: { creatorId: req.user.id, status: 'REACTION_UPLOADED', scheduledAt: { lt: now } } });
      res.json({ my: my > 0, available: available > 0, history: history > 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};