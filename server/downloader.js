const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const prisma = require('./db');

async function downloadVideoBackground(videoId, url, io, useProxy, initialInfo) {
  const ytDlpPath = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  
  // Получаем прокси из настроек
  const proxySetting = await prisma.setting.findUnique({ where: { key: 'proxy_url' } });
  const proxyUrl = proxySetting ? proxySetting.value : process.env.PROXY_URL;
  
  let errorLog = ''; 

  // Команда, основанная на логике твоего ТГ-бота
  const args = [
    '--newline', 
    '--progress', 
    '--no-warnings', 
    '--no-playlist',
    '-q', // quiet режим, как в боте
    
    // ЛОГИКА ИЗ БОТА: Приоритет H264 (MP4) и высокого разрешения
    '-S', 'vcodec:h264,res,acodec:m4a',
    
    // Принудительная склейка в mp4 контейнер
    '--merge-output-format', 'mp4',
    
    '--no-part', 
    '--write-thumbnail', 
    '--convert-thumbnails', 'jpg',
    
    // Шаблон имени файла
    '-o', `originals/${videoId}.%(ext)s`,
    url
  ];

  if (useProxy && proxyUrl) {
    args.push('--proxy', proxyUrl);
  }

  const child = spawn(ytDlpPath, args);

  child.stdout.on('data', (data) => {
    const output = data.toString();
    // Парсим прогресс
    const match = output.match(/(\d+(\.\d+)?)%/);
    if (match) {
      const progress = parseFloat(match[1]);
      io.emit('downloadProgress', { videoId, progress, status: 'DOWNLOADING' });
    }
  });

  child.stderr.on('data', (data) => {
    errorLog += data.toString();
  });

  child.on('close', async (code) => {
    if (code === 0) {
      try {
        // Проверяем, существует ли файл (мог скачаться с другим расширением, если не сработал merge)
        const expectedPath = `originals/${videoId}.mp4`;
        const finalPath = fs.existsSync(path.resolve(process.cwd(), expectedPath)) 
          ? expectedPath 
          : `originals/${videoId}.mkv`; // Редкий фоллбек

        await prisma.originalVideo.update({
          where: { videoId },
          data: {
            title: initialInfo.title,
            duration: initialInfo.duration,
            filePath: expectedPath, // Мы форсировали mp4, так что путь будет таким
            thumbnailPath: `originals/${videoId}.jpg`,
            status: 'READY',
            errorMessage: null
          }
        });
        
        io.emit('downloadProgress', { videoId, progress: 100, status: 'READY' });
      } catch (e) {
        console.error("DB Update Error:", e);
        await prisma.originalVideo.update({ where: { videoId }, data: { status: 'ERROR', errorMessage: e.message } });
        io.emit('downloadProgress', { videoId, progress: 0, status: 'ERROR' });
      }
    } else {
      console.error("YT-DLP Error:", errorLog);
      await prisma.originalVideo.update({
        where: { videoId },
        data: { status: 'ERROR', errorMessage: 'Ошибка загрузки: видео недоступно или заблокировано' }
      });
      io.emit('downloadProgress', { videoId, progress: 0, status: 'ERROR' });
    }
  });
}

module.exports = { downloadVideoBackground };