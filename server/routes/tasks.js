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

const getYouTubeID = (url) => {
  const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
};

module.exports = (io) => {
  // --- ОБЩИЕ / ИНФО ---
  router.get('/creators', protect, async (req, res) => {
    try {
      const creators = await prisma.user.findMany({
        where: { role: 'CREATOR' },
        select: { id: true, username: true, tgUsername: true }
      });
      res.json(creators);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/fetch-info', protect, async (req, res) => {
    const { url, force, useProxy } = req.body;
    const videoId = getYouTubeID(url);
    if (!videoId) return res.status(400).json({ error: 'Некорректная ссылка' });

    try {
      const proxySetting = await prisma.setting.findUnique({ where: { key: 'proxy_url' } });
      const proxyFlag = (useProxy && proxySetting) ? `--proxy "${proxySetting.value}"` : '';
      const ytDlpPath = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

      let video = await prisma.originalVideo.findUnique({ where: { videoId } });
      let existingChannelIds = [];

      if (video) {
        const tasks = await prisma.task.findMany({ where: { originalVideoId: video.id }, select: { channelId: true } });
        existingChannelIds = tasks.map(t => t.channelId);
        if (video.status === 'TOO_LONG') return res.json({ ...video, existingChannelIds });
        if (video.status === 'READY' && fs.existsSync(video.filePath || '') && !force) return res.json({ ...video, existingChannelIds });
        video = await prisma.originalVideo.update({ where: { videoId }, data: { status: 'DOWNLOADING', errorMessage: null } });
      } else {
        video = await prisma.originalVideo.create({ data: { videoId, url, status: 'DOWNLOADING' } });
      }

      const { stdout } = await execPromise(`${ytDlpPath} ${proxyFlag} --dump-json --skip-download "${url}"`, { maxBuffer: 10 * 1024 * 1024 });
      const info = JSON.parse(stdout);

      if (info.duration > 180) {
        video = await prisma.originalVideo.update({ where: { videoId }, data: { title: info.title, duration: Math.round(info.duration), status: 'TOO_LONG', errorMessage: 'Видео длиннее 3 минут' } });
        return res.json({ ...video, existingChannelIds });
      }

      video = await prisma.originalVideo.update({ where: { videoId }, data: { title: info.title, duration: Math.round(info.duration) } });
      downloadVideoBackground(videoId, url, io, useProxy, video);
      res.json({ ...video, existingChannelIds });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // --- ЛОГИКА КРЕАТОРА ---
  router.get('/available', protect, async (req, res) => {
    try {
      const { skip = 0, take = 10, channelId } = req.query;
      const where = { status: 'AWAITING_REACTION' };
      if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);
      const tasks = await prisma.task.findMany({
        where, include: { originalVideo: true, channel: true },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip), take: parseInt(take)
      });
      res.json(tasks);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/my-work', protect, async (req, res) => {
    try {
      const { channelId } = req.query;
      const where = { status: 'IN_PROGRESS', creatorId: req.user.id };
      if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);
      res.json(await prisma.task.findMany({ where, include: { originalVideo: true, channel: true }, orderBy: { updatedAt: 'desc' } }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/history', protect, async (req, res) => {
    try {
      const { skip = 0, take = 10, channelId } = req.query;
      const where = { creatorId: req.user.id, status: { in: ['REACTION_UPLOADED', 'PUBLISHED'] } };
      if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);
      res.json(await prisma.task.findMany({
        where, include: { originalVideo: true, channel: true },
        orderBy: { updatedAt: 'desc' }, skip: parseInt(skip), take: parseInt(take)
      }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/:id/claim', protect, async (req, res) => {
    try {
      const task = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'IN_PROGRESS', creatorId: req.user.id, claimedAt: new Date() }
      });
      res.json(task);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/:id/abandon', protect, async (req, res) => {
    try {
      await prisma.task.update({ where: { id: parseInt(req.params.id) }, data: { status: 'AWAITING_REACTION', creatorId: null } });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/:id/upload', protect, upload.single('video'), async (req, res) => {
    try {
      const updatedTask = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'REACTION_UPLOADED', reactionFilePath: req.file.path.replace(/\\/g, '/'), reactionUploadedAt: new Date(), needsFixing: false },
        include: { channel: true, originalVideo: true }
      });
      const staff = await prisma.user.findMany({ where: { role: { in: ['MANAGER', 'ADMIN'] } }, select: { id: true } });
      for (const s of staff) {
        await prisma.notification.create({
          data: {
            userId: s.id, taskId: updatedTask.id, targetTab: "active", title: "Реакция готова ✅",
            message: `${req.user.username} сдал видео по каналу ${updatedTask.channel.name}`, type: "REACTION_UPLOADED"
          }
        });
        io.to(`user_${s.id}`).emit('new_notification');
        sendPushNotification(s.id, { title: "Реакция готова ✅", message: `${req.user.username} сдал видео.`, url: "/manager" });
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // --- ЛОГИКА МЕНЕДЖЕРА ---
  router.post('/bulk', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    const { originalVideoId, tasks } = req.body;
    try {
      const createdTasks = await Promise.all(tasks.map(async (t) => {
        return prisma.task.create({
          data: {
            originalVideoId: parseInt(originalVideoId), channelId: parseInt(t.channelId),
            managerId: req.user.id, creatorId: t.creatorId ? parseInt(t.creatorId) : null,
            status: t.creatorId ? 'IN_PROGRESS' : 'AWAITING_REACTION',
            claimedAt: t.creatorId ? new Date() : null,
            deadline: t.deadline ? new Date(t.deadline) : null,
            scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
          },
          include: { channel: true, creator: true, originalVideo: true }
        });
      }));

      for (const task of createdTasks) {
        if (task.creatorId) {
          const deadlineText = task.deadline ? ` Дедлайн: ${new Date(task.deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : '';
          await prisma.notification.create({
            data: {
              userId: task.creatorId, taskId: task.id, targetTab: "my", title: "Новое задание! 🎬",
              message: `Канал: ${task.channel.name}.${deadlineText}`, type: "TASK_ASSIGNED"
            }
          });
          io.to(`user_${task.creatorId}`).emit('new_notification');
          sendPushNotification(task.creatorId, { title: "Новое задание! 🎬", message: `Для канала ${task.channel.name}`, url: "/creator" });
        }
      }
      res.json({ success: true, count: createdTasks.length });
    } catch (err) { res.status(500).json({ error: "Ошибка создания задач" }); }
  });

  router.get('/managed', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
      const { skip = 0, take = 10, tab, channelId } = req.query;
      const where = { managerId: req.user.id };
      if (tab === 'active') where.status = { not: 'PUBLISHED' };
      else if (tab === 'published') where.status = 'PUBLISHED';
      if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);
      res.json(await prisma.task.findMany({
        where, include: { originalVideo: true, channel: true, creator: true },
        orderBy: { updatedAt: 'desc' }, skip: parseInt(skip), take: parseInt(take)
      }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/:id/reject', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
      const { reason } = req.body;
      const task = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'IN_PROGRESS', needsFixing: true, rejectionReason: reason },
        include: { creator: true, channel: true, originalVideo: true }
      });
      if (task.creatorId) {
        await prisma.notification.create({
          data: {
            userId: task.creatorId, taskId: task.id, targetTab: "my", title: "Нужны правки ⚠️",
            message: `Канал: ${task.channel.name}. Причина: ${reason}`, type: "REVISION_NEEDED"
          }
        });
        io.to(`user_${task.creatorId}`).emit('new_notification');
        sendPushNotification(task.creatorId, { title: "Нужны правки ⚠️", message: `Видео отклонено: ${reason}`, url: "/creator" });
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/:id/publish', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
      const { youtubeUrl, scheduledAt } = req.body;
      const task = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'PUBLISHED', youtubeUrl, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, publishedAt: new Date(), uploaderId: req.user.id },
        include: { originalVideo: true, channel: true }
      });
      if (task.creatorId) {
        await prisma.notification.create({
          data: {
            userId: task.creatorId, taskId: task.id, targetTab: "history", title: "Опубликовано! 🎉",
            message: `Видео для канала ${task.channel.name} вышло на YouTube`, type: "PUBLISHED"
          }
        });
        io.to(`user_${task.creatorId}`).emit('new_notification');
        sendPushNotification(task.creatorId, { title: "Опубликовано! 🎉", message: `Ваша работа на YouTube!`, url: "/creator" });
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // --- УВЕДОМЛЕНИЯ И НАСТРОЙКИ ---
  router.get('/notifications', protect, async (req, res) => {
    try {
      const skip = parseInt(req.query.skip) || 0;
      const take = parseInt(req.query.take) || 15;
      res.json(await prisma.notification.findMany({
        where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, skip, take
      }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/notifications/:id/read', protect, async (req, res) => {
    try {
      const userId = parseInt(req.user.id);
      await prisma.notification.update({ where: { id: parseInt(req.params.id), userId }, data: { isRead: true } });
      io.to(`user_${userId}`).emit('new_notification');
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/notifications/preferences', protect, async (req, res) => {
    try {
      const userId = parseInt(req.user.id);
      let prefs = await prisma.userPreference.findUnique({ where: { userId } });
      if (!prefs) prefs = await prisma.userPreference.create({ data: { userId, enabled: true } });
      res.json(prefs);
    } catch (err) { res.json({ enabled: true, userId: req.user.id }); }
  });

  router.patch('/notifications/preferences', protect, async (req, res) => {
    try {
      const userId = parseInt(req.user.id);
      const updated = await prisma.userPreference.upsert({
        where: { userId }, update: { enabled: Boolean(req.body.enabled) }, create: { userId, enabled: Boolean(req.body.enabled) }
      });
      res.json(updated);
    } catch (err) { res.status(500).json({ error: "Ошибка сохранения" }); }
  });

  // --- ФАЙЛЫ И СИСТЕМНОЕ ---
  router.get('/download-file', async (req, res) => {
    const { path: filePath, token, name } = req.query;
    try {
      require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      const fullPath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) return res.status(404).send("File not found");

      const stat = fs.statSync(fullPath);
      const range = req.headers.range;
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name || 'video.mp4')}"`);

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': (end - start) + 1 });
        fs.createReadStream(fullPath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Length': stat.size });
        fs.createReadStream(fullPath).pipe(res);
      }
    } catch (err) { res.status(401).send("Unauthorized"); }
  });

  router.get('/alerts-status', protect, async (req, res) => {
    const now = new Date();
    try {
      const my = await prisma.task.count({ where: { creatorId: req.user.id, status: 'IN_PROGRESS', OR: [{ deadline: { lt: now } }, { needsFixing: true }] } });
      const available = await prisma.task.count({ where: { status: 'AWAITING_REACTION', deadline: { lt: now } } });
      const history = await prisma.task.count({ where: { creatorId: req.user.id, status: 'REACTION_UPLOADED', scheduledAt: { lt: now } } });
      res.json({ my: my > 0, available: available > 0, history: history > 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.patch('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
      const { deadline, scheduledAt, creatorId } = req.body;
      const data = {
        deadline: deadline ? new Date(deadline) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        creatorId: creatorId ? parseInt(creatorId) : null,
        status: creatorId ? 'IN_PROGRESS' : 'AWAITING_REACTION'
      };
      res.json(await prisma.task.update({ where: { id: parseInt(req.params.id) }, data }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try { res.json(await prisma.task.delete({ where: { id: parseInt(req.params.id) } })); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};