const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const { exec } = require('child_process'); // ДОБАВЛЕНО
const util = require('util'); // ДОБАВЛЕНО
const prisma = require('./db');
const { downloadVideoBackground } = require('./downloader');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { protect, authorize } = require('./auth');
require('dotenv').config();

const execPromise = util.promisify(exec); // ДОБАВЛЕНО
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/originals', express.static(path.join(__dirname, 'originals')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dirs = ['originals', 'uploads'];
dirs.forEach(d => !fs.existsSync(d) && fs.mkdirSync(d));

const cleanupDownloads = async () => {
  try {
    await prisma.originalVideo.updateMany({
      where: { status: 'DOWNLOADING' },
      data: { status: 'ERROR', errorMessage: 'Сервер был перезагружен во время загрузки' }
    });
  } catch (err) { console.error(err); }
};
cleanupDownloads();

const getYouTubeID = (url) => {
  const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- ROUTES ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

    // Простая проверка (для MVP). Позже заменим на bcrypt.compare
    if (password !== user.password) {
      return res.status(401).json({ error: 'Неверный пароль' });
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

app.get('/api/channels', async (req, res) => {
  res.json(await prisma.channel.findMany());
});

app.post('/api/tasks/fetch-info', async (req, res) => {
  const { url, force, useProxy } = req.body;
  const videoId = getYouTubeID(url);

  if (!videoId) {
    return res.status(400).json({ error: 'Некорректная ссылка. Поддерживаются только Shorts и видео YouTube.' });
  }

  const proxySetting = await prisma.setting.findUnique({ where: { key: 'proxy_url' } });
  const proxyUrl = proxySetting ? proxySetting.value : process.env.PROXY_URL;
  const proxyFlag = (useProxy && proxyUrl) ? `--proxy "${proxyUrl}"` : '';
  const ytDlpPath = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

  try {
    // 1. Пытаемся найти видео в базе
    let video = await prisma.originalVideo.findUnique({ where: { videoId } });
    
    // Переменная для хранения ID каналов
    let existingChannelIds = [];

    // 2. Если видео найдено — сразу смотрим, на каких каналах оно уже есть
    if (video) {
      const existingTasks = await prisma.task.findMany({
        where: { originalVideoId: video.id },
        select: { channelId: true }
      });
      existingChannelIds = existingTasks.map(t => t.channelId);

      // Если видео слишком длинное — просто возвращаем его со списком каналов
      if (video.status === 'TOO_LONG') {
        return res.json({ ...video, existingChannelIds });
      }

      // Проверяем физическое наличие файла
      const videoExists = video.filePath && fs.existsSync(video.filePath);

      // Если видео READY и файл на месте — отдаем данные
      if (video.status === 'READY' && videoExists) {
        return res.json({ ...video, existingChannelIds });
      }

      // Если нужна перекачка (ошибка + force или файл пропал)
      if ((video.status === 'ERROR' && force) || (video.status === 'READY' && !videoExists)) {
        video = await prisma.originalVideo.update({ 
          where: { videoId }, 
          data: { status: 'DOWNLOADING', errorMessage: null } 
        });
        downloadVideoBackground(videoId, url, io, useProxy, video);
        return res.json({ ...video, existingChannelIds });
      }

      // В любой другой ситуации (например, уже качается) — просто возвращаем текущее состояние
      return res.json({ ...video, existingChannelIds });
    }

    // 3. Если видео в базе НЕТ — создаем новую запись
    video = await prisma.originalVideo.create({ 
      data: { videoId, url, status: 'DOWNLOADING' } 
    });

    // Получаем метаданные через yt-dlp
    try {
      console.log(`[Info] Запрос метаданных для ${videoId}`);
      const { stdout: infoJson } = await execPromise(
        `${ytDlpPath} ${proxyFlag} --dump-json --skip-download --no-warnings --no-playlist "${url}"`, 
        { maxBuffer: 1024 * 1024 * 10 } 
      );
      const info = JSON.parse(infoJson);

      // Проверка на длительность
      if (info.duration > 180) {
        video = await prisma.originalVideo.update({
          where: { videoId },
          data: { 
            title: info.title, 
            duration: Math.round(info.duration), 
            status: 'TOO_LONG', 
            errorMessage: 'Видео превышает лимит 3 минуты' 
          }
        });
        return res.json({ ...video, existingChannelIds: [] });
      }

      // Обновляем инфо и запускаем скачивание самого файла
      video = await prisma.originalVideo.update({
        where: { videoId },
        data: { title: info.title, duration: Math.round(info.duration) }
      });
      
      downloadVideoBackground(videoId, url, io, useProxy, video);
      
      // Возвращаем результат (для нового видео каналов всегда 0)
      return res.json({ ...video, existingChannelIds: [] });

    } catch (ytError) {
      const errorMsg = ytError.stderr || ytError.message;
      video = await prisma.originalVideo.update({
        where: { videoId },
        data: { status: 'ERROR', errorMessage: errorMsg }
      });
      return res.json({ ...video, existingChannelIds: [] });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { originalVideoId, channelIds, priority } = req.body;
  try {
    const tasks = await Promise.all(channelIds.map(id => 
      prisma.task.create({ data: { 
        originalVideoId: parseInt(originalVideoId), 
        channelId: parseInt(id), 
        priority 
      }})
    ));
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tasks', async (req, res) => {
  res.json(await prisma.task.findMany({ 
    where: { status: 'AWAITING_REACTION' },
    include: { originalVideo: true } 
  }));
});

app.delete('/api/tasks/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: parseInt(req.params.id) } });
    
    if (!task) return res.status(404).json({ error: 'Задача не найдена' });
    if (task.status !== 'AWAITING_REACTION') {
      return res.status(400).json({ error: 'Нельзя удалить задачу, которую уже взяли в работу' });
    }

    await prisma.task.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const upload = multer({ dest: 'uploads/' });
app.post('/api/tasks/:id/upload', upload.single('video'), async (req, res) => {
  await prisma.task.update({
    where: { id: parseInt(req.params.id) },
    data: { 
      status: 'REACTION_UPLOADED', 
      reactionFilePath: req.file.path.replace(/\\/g, '/'),
      needsFixing: false // Видео обновлено
    }
  });
  res.json({ success: true });
});

app.get('/api/uploader/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { 
        status: 'REACTION_UPLOADED' 
      },
      include: { 
        channel: true,       // ОБЯЗАТЕЛЬНО
        originalVideo: true  // ОБЯЗАТЕЛЬНО
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Опубликовать с датой
app.post('/api/tasks/:id/publish', protect, async (req, res) => {
  const { youtubeUrl, scheduledAt } = req.body;
  await prisma.task.update({
    where: { id: parseInt(req.params.id) },
    data: { 
      status: 'PUBLISHED', 
      youtubeUrl, 
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      uploaderId: req.user.id // Записываем ID менеджера, который нажал "Опубликовать"
    }
  });
  res.json({ success: true });
});

app.get('/api/tasks/available', protect, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { status: 'AWAITING_REACTION' },
    include: { originalVideo: true, channel: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tasks);
});

app.get('/api/tasks/my-work', protect, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { 
      status: 'IN_PROGRESS',
      creatorId: req.user.id // Только мои!
    },
    include: { originalVideo: true, channel: true },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(tasks);
});

// 3. Взять задачу в работу
app.post('/api/tasks/:id/claim', protect, async (req, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        status: 'IN_PROGRESS',
        creatorId: req.user.id // Записываем ID текущего пользователя
      }
    });
    res.json(task);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks/:id/abandon', async (req, res) => {
  await prisma.task.update({
    where: { id: parseInt(req.params.id) },
    data: { status: 'AWAITING_REACTION' }
  });
  res.json({ success: true });
});

// 2. Отклонить реакцию (Загрузчик)
app.post('/api/tasks/:id/reject', async (req, res) => {
  const { reason } = req.body;
  await prisma.task.update({
    where: { id: parseInt(req.params.id) },
    data: { 
      status: 'IN_PROGRESS', 
      needsFixing: true,
      rejectionReason: reason 
    }
  });
  res.json({ success: true });
});

app.post('/api/tasks/:id/cancel-upload', async (req, res) => {
  try {
    await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'IN_PROGRESS' }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось отозвать видео' });
  }
});

// 3. Получить список "На проверке" для конкретного креатора
app.get('/api/tasks/submitted', async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { status: 'REACTION_UPLOADED' },
    include: { originalVideo: true, channel: true },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(tasks);
});

app.post('/api/tasks/claim-all', async (req, res) => {
  const { channelId } = req.body; // Получаем ID канала из запроса
  
  const where = { status: 'AWAITING_REACTION' };
  if (channelId && channelId !== 'all') {
    where.channelId = parseInt(channelId);
  }

  try {
    const result = await prisma.task.updateMany({
      where,
      data: { status: 'IN_PROGRESS' }
    });
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/history', protect, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      creatorId: req.user.id, // Только мои!
      status: { in: ['REACTION_UPLOADED', 'PUBLISHED'] }
    },
    include: { originalVideo: true, channel: true },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(tasks);
});

app.get('/api/stats', protect, async (req, res) => {
  try {
    // ... (твои текущие счетчики totalTasks, awaiting и т.д.) ...
    const totalTasks = await prisma.task.count();
    const awaiting = await prisma.task.count({ where: { status: 'AWAITING_REACTION' } });
    const inProgress = await prisma.task.count({ where: { status: 'IN_PROGRESS' } });
    const submitted = await prisma.task.count({ where: { status: 'REACTION_UPLOADED' } });
    const published = await prisma.task.count({ where: { status: 'PUBLISHED' } });

    // НОВОЕ: Получаем топ 5 креаторов по количеству ОПУБЛИКОВАННЫХ видео
    const creators = await prisma.user.findMany({
      where: { role: 'CREATOR' },
      select: {
        username: true,
        _count: {
          select: { tasks: { where: { status: 'PUBLISHED' } } }
        }
      },
      orderBy: {
        tasks: { _count: 'desc' }
      },
      take: 5
    });

    const channelsData = await prisma.channel.findMany({
      include: { _count: { select: { tasks: true } } }
    });

    const recent = await prisma.task.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { originalVideo: true, channel: true }
    });

    res.json({
      counters: { totalTasks, awaiting, inProgress, submitted, published },
      channels: channelsData.map(c => ({ name: c.name, count: c._count.tasks })),
      creators: creators.map(c => ({ name: c.username, count: c._count.tasks })), // Отправляем топ креаторов
      recent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings', async (req, res) => {
  const settings = await prisma.setting.findMany();
  res.json(settings);
});

app.post('/api/admin/settings', async (req, res) => {
  const { key, value } = req.body;
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
  // Обновляем в процессе, чтобы yt-dlp сразу подхватил
  if (key === 'proxy_url') process.env.PROXY_URL = value;
  res.json({ success: true });
});

// --- УПРАВЛЕНИЕ КАНАЛАМИ ---
app.post('/api/admin/channels', async (req, res) => {
  const channel = await prisma.channel.create({ data: { name: req.body.name } });
  res.json(channel);
});

app.delete('/api/admin/channels/:id', async (req, res) => {
  await prisma.channel.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
});

app.patch('/api/admin/channels/:id', async (req, res) => {
  const { name, titlePrefix, descriptionFooter } = req.body;
  const channel = await prisma.channel.update({
    where: { id: parseInt(req.params.id) },
    data: { name, titlePrefix, descriptionFooter } 
  });
  res.json(channel);
});

// --- УПРАВЛЕНИЕ СОТРУДНИКАМИ ---
app.get('/api/admin/users', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        // Эта часть заставляет Prisma посчитать количество задач
        _count: {
          select: { tasks: true } 
        }
      }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', async (req, res) => {
  const { username, password, role } = req.body;
  const user = await prisma.user.create({ data: { username, password, role } });
  res.json(user);
});

app.delete('/api/admin/users/:id', async (req, res) => {
  await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ success: true });
});

server.listen(PORT, () => console.log(`🚀 ClipFlow on port ${PORT}`));