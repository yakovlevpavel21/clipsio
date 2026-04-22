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

// Хелпер для получения ID видео
const getYouTubeID = (url) => {
  const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- ФУНКЦИЯ ПРОВЕРКИ ФИЗИЧЕСКОГО НАЛИЧИЯ ФАЙЛОВ ---
const appendFileStatus = (task) => {
  if (!task) return null;
  const cleanPath = (p) => p ? p.replace(/^\/+/, '') : null;
  
  const oPath = cleanPath(task.originalVideo?.filePath);
  const rPath = cleanPath(task.reactionFilePath);

  const originalAbs = oPath ? path.resolve(process.cwd(), oPath) : null;
  const reactionAbs = rPath ? path.resolve(process.cwd(), rPath) : null;

  return {
    ...task,
    originalFileExists: originalAbs ? fs.existsSync(originalAbs) : false,
    reactionFileExists: reactionAbs ? fs.existsSync(reactionAbs) : false
  };
};

module.exports = (io) => {

  // Основной роут контента (используется всеми)
  router.get('/content', protect, async (req, res) => {
    const { role, id: userId } = req.user;
    const { skip = 0, take = 20, channelId, status, creatorId } = req.query;

    try {
      let where = {};
      if (role === 'MANAGER') where.managerId = userId;
      else if (role === 'CREATOR') where.creatorId = userId;
      // ADMIN видит всё

      if (channelId && channelId !== 'all') where.channelId = parseInt(channelId);
      if (status && status !== 'all') {
        if (status === 'FIXING') where.needsFixing = true;
        else where.status = status;
      }
      if (creatorId && creatorId !== 'all' && (role === 'ADMIN' || role === 'MANAGER')) {
        where.creatorId = parseInt(creatorId);
      }

      const tasks = await prisma.task.findMany({
        where,
        include: { 
          originalVideo: true, 
          channel: true, 
          creator: { select: { id: true, username: true } } 
        },
        // Сортируем по плану публикации (новые/будущие сверху)
        // Если плана нет, используем дату создания как запасной вариант
        orderBy: [
          { scheduledAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: parseInt(skip),
        take: parseInt(take)
      });

      res.json(tasks.map(appendFileStatus));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // История для профиля
  router.get('/user-history/:userId', protect, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { skip = 0, take = 10, role = 'creator', month = 'all' } = req.query;

      let dateFilter = {};
      if (month !== 'all') {
        const [year, m] = month.split('-');
        dateFilter = { publishedAt: { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) } };
      }

      const where = {
        status: 'PUBLISHED',
        [role === 'manager' ? 'managerId' : 'creatorId']: userId,
        ...dateFilter
      };

      const history = await prisma.task.findMany({
        where,
        include: { originalVideo: true, channel: true },
        orderBy: { publishedAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(take)
      });

      res.json(history.map(appendFileStatus));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Список креаторов для селекторов
  router.get('/creators', protect, async (req, res) => {
    try {
      const creators = await prisma.user.findMany({
        where: { role: 'CREATOR' },
        select: { id: true, username: true, tgUsername: true }
      });
      res.json(creators);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Проверка видео перед созданием задачи
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

  // Статистика пользователя
  router.get('/user-stats/:userId', protect, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const [totalTasks, publishedCount, pendingCount] = await Promise.all([
        prisma.task.count({ where: { creatorId: userId } }),
        prisma.task.count({ where: { creatorId: userId, status: 'PUBLISHED' } }),
        prisma.task.count({ where: { creatorId: userId, status: 'REACTION_UPLOADED' } })
      ]);
      res.json({ totalTasks, publishedCount, pendingCount });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Создание задач (Bulk)
  router.post('/bulk', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    const { originalVideoId, tasks } = req.body;
    if (!originalVideoId || !tasks || !Array.isArray(tasks)) return res.status(400).json({ error: "Некорректные данные" });

    try {
      const createdTasks = [];
      for (const t of tasks) {
        const newTask = await prisma.task.create({
          data: {
            originalVideoId: parseInt(originalVideoId),
            channelId: parseInt(t.channelId),
            managerId: parseInt(req.user.id),
            creatorId: t.creatorId ? parseInt(t.creatorId) : null,
            status: 'AWAITING_REACTION',
            deadline: t.deadline ? new Date(t.deadline) : null,
            scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
          },
          include: { originalVideo: true, channel: true, creator: { select: { username: true } } }
        });
        io.emit('task_updated', appendFileStatus(newTask));
        createdTasks.push(newTask);
      }

      for (const task of createdTasks) {
        if (task.creatorId) {
          await prisma.notification.create({
            data: { userId: task.creatorId, taskId: task.id, title: "Новое задание! 🎬", message: `Для канала ${task.channel.name}`, type: "TASK_ASSIGNED" }
          });
          io.to(`user_${task.creatorId}`).emit('new_notification');
          sendPushNotification(task.creatorId, { title: "Новое задание!", message: task.channel.name });
        }
      }
      res.json({ success: true, count: createdTasks.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Загрузка результата (Upload)
  router.post('/:id/upload', protect, upload.single('video'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Файл не получен" });

      const fullTask = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { 
          status: 'REACTION_UPLOADED', 
          reactionFilePath: req.file.path.replace(/\\/g, '/'), 
          reactionUploadedAt: new Date(), 
          needsFixing: false 
        },
        // Убеждаемся, что managerId и данные канала подгружены
        include: { originalVideo: true, channel: true, creator: true, manager: true }
      });

      io.emit('task_updated', appendFileStatus(fullTask));

      // УВЕДОМЛЕНИЕ ТОЛЬКО ОТВЕТСТВЕННОМУ МЕНЕДЖЕРУ
      if (fullTask.managerId) {
        const targetId = fullTask.managerId;

        await prisma.notification.create({
          data: { 
            userId: targetId, 
            taskId: fullTask.id, 
            title: "Реакция готова ✅", 
            message: `${req.user.username} сдал(а) видео по каналу ${fullTask.channel.name}`, 
            type: "REACTION_UPLOADED" 
          }
        });

        // Шлем сигнал в персональную комнату менеджера
        io.to(`user_${targetId}`).emit('new_notification');
        
        // Пуш-уведомление на телефон
        sendPushNotification(targetId, { 
          title: "Реакция готова ✅", 
          message: `${fullTask.channel.name}: видео от ${req.user.username}` 
        });
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Отклонение (Reject)
  router.post('/:id/reject', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
      const fullTask = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'IN_PROGRESS', needsFixing: true, rejectionReason: req.body.reason },
        include: { creator: true, channel: true, originalVideo: true, manager: true }
      });
      io.emit('task_updated', appendFileStatus(fullTask));
      if (fullTask.creatorId) {
        await prisma.notification.create({
          data: { userId: fullTask.creatorId, taskId: fullTask.id, title: "Нужны правки ⚠️", message: `Канал: ${fullTask.channel.name}. Причина: ${req.body.reason}`, type: "REVISION_NEEDED" }
        });
        io.to(`user_${fullTask.creatorId}`).emit('new_notification');
        sendPushNotification(fullTask.creatorId, { title: "Нужны правки ⚠️", message: req.body.reason });
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Публикация (Publish)
  router.post('/:id/publish', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
      const fullTask = await prisma.task.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'PUBLISHED', youtubeUrl: req.body.youtubeUrl, scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null, publishedAt: new Date(), uploaderId: req.user.id },
        include: { originalVideo: true, channel: true, creator: true, manager: true }
      });
      io.emit('task_updated', appendFileStatus(fullTask));
      if (fullTask.creatorId) {
        //await prisma.notification.create({
        //  data: { userId: fullTask.creatorId, taskId: fullTask.id, title: "Опубликовано! 🎉", message: `Видео для канала ${fullTask.channel.name} успешно вышло`, type: "PUBLISHED" }
        //});
        //io.to(`user_${fullTask.creatorId}`).emit('new_notification');
        //sendPushNotification(fullTask.creatorId, { title: "Опубликовано!", message: fullTask.channel.name });
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/:id/claim', protect, authorize('CREATOR', 'ADMIN'), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'IN_PROGRESS',
          claimedAt: new Date(),
        },
        include: { originalVideo: true, channel: true, creator: true }
      });

      io.emit('task_updated', appendFileStatus(task));
      res.json(appendFileStatus(task));
    } catch (err) {
      res.status(500).json({ error: "Не удалось взять задачу в работу" });
    }
  });

  // Редактирование (Patch)
  router.patch('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { deadline, scheduledAt, creatorId } = req.body;
      const current = await prisma.task.findUnique({ where: { id: taskId } });
      let updatedStatus = current.status;
      if (creatorId && parseInt(creatorId) !== current.creatorId) updatedStatus = 'IN_PROGRESS';
      
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { 
          deadline: deadline ? new Date(deadline) : null, 
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null, 
          creatorId: creatorId ? parseInt(creatorId) : null, 
          status: updatedStatus 
        },
        include: { originalVideo: true, channel: true, creator: { select: { id: true, username: true } }, manager: { select: { id: true, username: true } } }
      });
      io.emit('task_updated', appendFileStatus(updated));
      res.json(appendFileStatus(updated));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Удаление
  router.delete('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try { res.json(await prisma.task.delete({ where: { id: parseInt(req.params.id) } })); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Скачивание файлов
  router.get('/download-file', async (req, res) => {
    const { path: filePath, token, name } = req.query;
    try {
      require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      const fullPath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) return res.status(404).send("File not found");
      const stat = fs.statSync(fullPath);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name || 'video.mp4')}"`);
      if (req.headers.range) {
        const parts = req.headers.range.replace(/bytes=/, "").split("-");
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

  return router;
};