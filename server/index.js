// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const prisma = require('./db');
const { initTelegramBot } = require('./telegram');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 5000;

// Инициализация бота с доступом к сокетам
initTelegramBot(io);

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/originals', express.static(path.join(__dirname, 'originals')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Папки
['originals', 'uploads'].forEach(d => !fs.existsSync(d) && fs.mkdirSync(d));

// Сокеты и Online Status
const activeUsers = new Map();
app.set('activeUsers', activeUsers); // Делаем Map доступным в роутах

io.on('connection', (socket) => {
  // Когда фронтенд присылает ID пользователя
  socket.on('user_online', (userId) => {
    const id = parseInt(userId);
    if (!id) return;

    socket.userId = id;
    
    // ВАЖНО: Без этой строки сервер не сможет слать уведомления лично этому юзеру
    socket.join(`user_${id}`); 
    
    console.log(`Юзер ${id} вошел в комнату user_${id}`);

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

// Heartbeat: обновляем время в базе раз в минуту для тех, кто онлайн
setInterval(async () => {
  const ids = Array.from(activeUsers.keys());
  if (ids.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { lastActive: new Date() }
    }).catch(() => {});
  }
}, 60000);

// ПОДКЛЮЧЕНИЕ РОУТОВ
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks')(io)); // Передаем io в задачи для уведомлений
app.use('/api/admin', require('./routes/admin'));
app.use('/api/stats', require('./routes/stats'));
app.get('/api/channels', require('./auth').protect, async (req, res) => {
  const prisma = require('./db');
  res.json(await prisma.channel.findMany());
});

server.listen(PORT, () => console.log(`🚀 Clipsio on port ${PORT}`));