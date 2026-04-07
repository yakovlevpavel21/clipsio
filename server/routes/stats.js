// server/routes/stats.js
const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { protect } = require('../auth');

router.get('/', protect, async (req, res) => {
  const activeUsers = req.app.get('activeUsers'); // Берем Map из настроек приложения

  try {
    const [total, awaiting, inProgress, submitted, published] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'AWAITING_REACTION' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'REACTION_UPLOADED' } }),
      prisma.task.count({ where: { status: 'PUBLISHED' } }),
    ]);

    const creatorsData = await prisma.user.findMany({
      where: { role: 'CREATOR' },
      select: {
        id: true,
        username: true,
        lastActive: true,
        _count: { select: { tasks: { where: { status: 'PUBLISHED' } } } }
      },
      orderBy: { tasks: { _count: 'desc' } },
      take: 5
    });

    const channels = await prisma.channel.findMany({ 
      include: { _count: { select: { tasks: true } } } 
    });

    const recent = await prisma.task.findMany({ 
      take: 5, 
      orderBy: { updatedAt: 'desc' }, 
      include: { originalVideo: true, channel: true } 
    });

    res.json({
      counters: { totalTasks: total, awaiting, inProgress, submitted, published },
      channels: channels.map(c => ({ name: c.name, count: c._count.tasks })),
      creators: creatorsData.map(c => ({
        id: c.id,
        name: c.username,
        count: c._count.tasks,
        lastActive: c.lastActive,
        isOnline: activeUsers.has(c.id)
      })),
      recent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;