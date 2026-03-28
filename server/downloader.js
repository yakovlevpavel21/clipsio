const { spawn } = require('child_process');
const prisma = require('./db');

async function downloadVideoBackground(videoId, url, io, useProxy, initialInfo) {
  const ytDlpPath = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const proxySetting = await prisma.setting.findUnique({ where: { key: 'proxy_url' } });
  const proxyUrl = proxySetting ? proxySetting.value : process.env.PROXY_URL;
  let errorLog = ''; 

  const args = [
    '--newline', '--progress', '--no-warnings', '--no-playlist',
    '--no-write-playlist-metafiles', '--no-check-certificates',
    '-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--no-part', '--write-thumbnail', '--convert-thumbnails', 'jpg',
    '-o', `originals/${videoId}.%(ext)s`,
    url
  ];

  if (useProxy && proxyUrl) {
    args.push('--proxy', proxyUrl);
  }

  const child = spawn(ytDlpPath, args);

  child.stdout.on('data', (data) => {
    const match = data.toString().match(/(\d+(\.\d+)?)%/);
    if (match) {
      io.emit('downloadProgress', { videoId, progress: parseFloat(match[1]), status: 'DOWNLOADING' });
    }
  });

  child.stderr.on('data', (data) => {
    errorLog += data.toString();
  });

  child.on('close', async (code) => {
    if (code === 0) {
      try {
        await prisma.originalVideo.update({
          where: { videoId },
          data: {
            title: initialInfo.title,
            duration: initialInfo.duration,
            filePath: `originals/${videoId}.mp4`,
            thumbnailPath: `originals/${videoId}.jpg`,
            status: 'READY',
            errorMessage: null
          }
        });
        io.emit('downloadProgress', { videoId, progress: 100, status: 'READY' });
      } catch (e) {
        await prisma.originalVideo.update({ where: { videoId }, data: { status: 'ERROR', errorMessage: e.message } });
        io.emit('downloadProgress', { videoId, progress: 0, status: 'ERROR' });
      }
    } else {
      await prisma.originalVideo.update({
        where: { videoId },
        data: { status: 'ERROR', errorMessage: errorLog || 'Ошибка при скачивании файла' }
      });
      io.emit('downloadProgress', { videoId, progress: 0, status: 'ERROR' });
    }
  });
}

module.exports = { downloadVideoBackground };