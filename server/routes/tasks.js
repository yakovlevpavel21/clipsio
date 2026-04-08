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
const { sendToGroup, queueNotification } = require('../telegram');
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
    const { originalVideoId, tasks } = req.body;
    
    try {
      const createdTasks = await Promise.all(tasks.map(async (t) => {
        return prisma.task.create({
          data: {
            originalVideoId: parseInt(originalVideoId),
            channelId: parseInt(t.channelId),
            managerId: req.user.id,
            creatorId: t.creatorId ? parseInt(t.creatorId) : null,
            status: t.creatorId ? 'IN_PROGRESS' : 'AWAITING_REACTION',
            claimedAt: t.creatorId ? new Date() : null,
            deadline: t.deadline ? new Date(t.deadline) : null,
            scheduledAt: t.scheduledAt ? new Date(scheduledAt) : null,
          },
          include: { channel: true, creator: true, originalVideo: true }
        });
      }));
      
      // 1. Уведомляем тех, кому назначили задачу персонально
      const assignedTasks = createdTasks.filter(t => t.creatorId);
      
      for (const task of assignedTasks) {
        await sendPushNotification(task.creatorId, {
          title: "Персональное задание!",
          message: `Вам назначено видео на канале ${task.channel.name}`,
          url: "/creator"
        });
      }

      // 2. Если есть задачи в общую ленту — уведомляем ВСЕХ креаторов
      const toFeedCount = createdTasks.filter(t => !t.creatorId).length;
      if (toFeedCount > 0) {
        const allCreators = await prisma.user.findMany({ where: { role: 'CREATOR' } });
        
        const pushPromises = allCreators.map(creator => 
          sendPushNotification(creator.id, {
            title: "Новые задачи в ленте!",
            message: `В ленту Clipsio добавлено ${toFeedCount} видео.`,
            url: "/creator"
          })
        );
        await Promise.all(pushPromises);
      }

      // ТЕЛЕГРАМ ПОЛНОСТЬЮ УДАЛЕН ИЗ ЭТОГО РОУТА

      res.json({ success: true, count: createdTasks.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- СПИСКИ ДЛЯ КРЕАТОРА ---
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
      const managers = await prisma.user.findMany({ where: { role: 'MANAGER', NOT: { tgUsername: null } } });
      const mTags = managers.map(m => `@${m.tgUsername}`).join(' ');
      let msg = `🎬 <b>Реакция готова!</b>\nКреатор <b>${req.user.username}</b> загрузил видео для <b>${updatedTask.channel.name}</b>.`;
      if (mTags) msg += `\n\n${mTags} — проверьте очередь!`;
      sendToGroup(msg).catch(() => { });
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
    const tag = task.creator?.tgUsername ? `@${task.creator.tgUsername}` : `Креатор ${task.creator.username}`;
    sendToGroup(`⚠️ ${tag}, <b>нужно исправить!</b>\nКанал: <b>${task.channel.name}</b>\nПричина: <i>${reason}</i>`).catch(() => { });
    res.json({ success: true });
  });

  router.post('/:id/publish', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    const { youtubeUrl, scheduledAt } = req.body;
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'PUBLISHED', youtubeUrl, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, publishedAt: new Date(), uploaderId: req.user.id },
      include: { originalVideo: true }
    });
    sendToGroup(`✅ <b>Опубликовано!</b>\n\n${youtubeUrl}`).catch(() => { });
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