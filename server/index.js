const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const cleanupOldFiles = require('./cleanup');

const prisma = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
// Увеличиваем лимиты для загрузки видео-реакций (Shorts могут весить много)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/originals', express.static(path.join(__dirname, 'originals')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Создание необходимых папок
['originals', 'uploads'].forEach(d => !fs.existsSync(d) && fs.mkdirSync(d));

// Сокеты и Online Status
const activeUsers = new Map();
app.set('activeUsers', activeUsers); 

io.on('connection', (socket) => {
  socket.on('user_online', (userId) => {
    const id = parseInt(userId);
    if (!id) return;

    socket.userId = id;
    
    // Вход в персональную комнату для получения личных уведомлений (красная точка)
    socket.join(`user_${id}`); 
    
    if (!activeUsers.has(id)) {
      activeUsers.set(id, new Set());
      io.emit('status_change', { userId: id, online: true });
    }
    activeUsers.get(id).add(socket.id);
  });

  socket.on('disconnect', async () => {
    const id = socket.userId;
    if (id && activeUsers.has(id)) {
      const userSockets = activeUsers.get(id);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        activeUsers.delete(id);
        const now = new Date();
        await prisma.user.update({ where: { id }, data: { lastActive: now } }).catch(() => {});
        io.emit('status_change', { userId: id, online: false, lastActive: now });
      }
    }
  });
});

// Heartbeat: обновление lastActive в базе раз в минуту
setInterval(async () => {
  const ids = Array.from(activeUsers.keys());
  if (ids.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { lastActive: new Date() }
    }).catch(() => {});
  }
}, 60000);

// Запускать очистку каждые 24 часа
// 1000мс * 60с * 60м * 24ч
setInterval(() => {
  cleanupOldFiles();
}, 24 * 60 * 60 * 1000);

// Опционально: запустить один раз сразу при старте сервера
cleanupOldFiles();

// ПОДКЛЮЧЕНИЕ РОУТОВ
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks/notifications', require('./routes/notifications')(io));
app.use('/api/tasks', require('./routes/tasks')(io));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/stats', require('./routes/stats'));

app.get('/api/channels', require('./auth').protect, async (req, res) => {
  res.json(await prisma.channel.findMany());
});

server.listen(PORT, () => console.log(`🚀 Clipsio Backend on port ${PORT}`));