// server/cleanup.js
const fs = require('fs');
const path = require('path');
const prisma = require('./db');

const cleanupOldFiles = async () => {
  console.log('--- [CLEANUP] Запуск очистки хранилища ---');
  
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  try {
    // 1. ОЧИСТКА РЕАКЦИЙ (РЕЗУЛЬТАТОВ)
    // Ищем задачи, где файл загружен более месяца назад
    const oldTasks = await prisma.task.findMany({
      where: {
        reactionFilePath: { not: null },
        reactionUploadedAt: { lt: monthAgo }
      },
      select: { id: true, reactionFilePath: true }
    });

    for (const task of oldTasks) {
      const absPath = path.resolve(process.cwd(), task.reactionFilePath);
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
        console.log(`[Cleanup] Удалена реакция: ${task.reactionFilePath}`);
      }
      // Убираем путь из БД, чтобы знать, что файла больше нет
      await prisma.task.update({
        where: { id: task.id },
        data: { reactionFilePath: null }
      });
    }

    // 2. ОЧИСТКА ОРИГИНАЛОВ
    // Ищем оригиналы, которые были добавлены более месяца назад
    const oldOriginals = await prisma.originalVideo.findMany({
      where: {
        createdAt: { lt: monthAgo }
      },
      select: { id: true, filePath: true, thumbnailPath: true }
    });

    for (const video of oldOriginals) {
      // Удаляем видео
      if (video.filePath) {
        const absVideoPath = path.resolve(process.cwd(), video.filePath);
        if (fs.existsSync(absVideoPath)) {
          fs.unlinkSync(absVideoPath);
          console.log(`[Cleanup] Удален оригинал: ${video.filePath}`);
        }
      }
      // Удаляем превью (опционально, они весят мало, но для чистоты удалим)
      if (video.thumbnailPath) {
        const absThumbPath = path.resolve(process.cwd(), video.thumbnailPath);
        if (fs.existsSync(absThumbPath)) {
          fs.unlinkSync(absThumbPath);
        }
      }

      // Обнуляем пути в базе
      await prisma.originalVideo.update({
        where: { id: video.id },
        data: { filePath: null, thumbnailPath: null }
      });
    }

    console.log(`--- [CLEANUP] Завершено. Удалено оригиналов: ${oldOriginals.length}, реакций: ${oldTasks.length} ---`);
  } catch (err) {
    console.error('[Cleanup Error]:', err.message);
  }
};

module.exports = cleanupOldFiles;