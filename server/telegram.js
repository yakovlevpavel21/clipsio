const { Telegraf } = require('telegraf');
const prisma = require('./db');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const adminId = process.env.TELEGRAM_ADMIN_ID;

// --- БУФЕР УВЕДОМЛЕНИЙ ---
let notificationBuffer = [];
let bufferTimer = null;

let isPairing = false;
let socketIo = null;

const initTelegramBot = (io) => {
  socketIo = io;
};


// Функция для получения текущего ID группы из базы данных
const getActiveGroupId = async () => {
  const setting = await prisma.setting.findUnique({ where: { key: 'tg_group_id' } });
  return setting ? setting.value : null;
};

const leaveCurrentGroup = async () => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'tg_group_id' } });
    if (setting && setting.value) {
      console.log(`[Bot] Попытка выхода из группы: ${setting.value}`);
      
      // Даем команду боту покинуть чат
      await bot.telegram.leaveChat(setting.value);
      
      console.log(`[Bot] Успешно покинул группу.`);
    }
  } catch (err) {
    // Ошибку игнорируем, если бота уже удалили из группы вручную
    console.error(`[Bot] Не удалось выйти из группы (возможно, бот уже не там):`, err.message);
  }
};

// Функция сборки и отправки накопленных уведомлений
// server/telegram.js

const flushBuffer = async () => {
  if (notificationBuffer.length === 0) return;

  const groupId = await getActiveGroupId();
  if (!groupId) {
    notificationBuffer = [];
    return;
  }

  // Ссылка на твой сайт (замени на свой IP/домен)
  const SITE_URL = "http://185.247.17.250:5001"; 
  const managerName = notificationBuffer[0].manager;

  // Группируем: сколько задач назначено каждому пользователю
  const userSummary = {};
  let totalToFeed = 0;

  notificationBuffer.forEach(item => {
    item.assigned.forEach(t => {
      userSummary[t.tag] = (userSummary[t.tag] || 0) + 1;
    });
    totalToFeed += item.toFeed;
  });

  // Формируем очень короткое сообщение
  let msg = `📝 <b>Новые задачи от ${managerName}</b>\n\n`;

  // Список по именам
  Object.entries(userSummary).forEach(([tag, count]) => {
    msg += `${tag}: <b>${count} шт.</b>\n`;
  });

  // Если есть задачи в общую ленту
  if (totalToFeed > 0) {
    msg += `В ленте: <b>${totalToFeed} шт.</b>\n`;
  }

  msg += `\n🚀 <a href="${SITE_URL}/creator">Открыть панель</a>`;

  try {
    await bot.telegram.sendMessage(groupId, msg, { 
      parse_mode: 'HTML',
      disable_web_page_preview: true 
    });
  } catch (err) {
    console.error("Ошибка отправки сводки:", err.message);
  }

  // Очищаем
  notificationBuffer = [];
  bufferTimer = null;
};

// --- СЛУШАТЕЛЬ СОБЫТИЙ ---

const startPairing = async () => {
  if (isPairing) return { success: true };

  try {
    await bot.telegram.getMe();
    
    bot.launch().catch(err => {
      console.error("Критическая ошибка при работе бота:", err.message);
      isPairing = false;
    });

    isPairing = true;

    // Авто-выключение через 5 минут
    setTimeout(() => {
      if (isPairing) stopPairing();
    }, 300000);

    return { success: true };
  } catch (err) {
    console.error("[Bot] Не удалось запустить режим привязки:", err.message);
    return { success: false, error: err.message };
  }
};

const stopPairing = () => {
  isPairing = false;
  bot.stop();
};

// Когда бота добавляют в новую группу или меняют его права
bot.on('my_chat_member', async (ctx) => {
  if (ctx.from.id.toString() !== adminId) return;

  if (ctx.myChatMember.new_chat_member.status === 'member') {
    const chatId = ctx.chat.id.toString();
    
    // Сохраняем в базу
    await prisma.setting.upsert({
      where: { key: 'tg_group_id' },
      update: { value: chatId },
      create: { key: 'tg_group_id', value: chatId }
    });
    
    // ОТПРАВЛЯЕМ СИГНАЛ НА ФРОНТЕНД
    if (socketIo) {
      socketIo.emit('settings_updated', { key: 'tg_group_id', value: chatId });
    }
    
    ctx.reply("✅ Группа привязана к Clipsio! Режим настройки выключен.");
    stopPairing();
  }
});

// --- ФУНКЦИИ ОТПРАВКИ ---

const queueNotification = (data) => {
  notificationBuffer.push(data);

  // Сбрасываем старый таймер и ставим новый (ждем 15 секунд затишья)
  if (bufferTimer) clearTimeout(bufferTimer);
  bufferTimer = setTimeout(flushBuffer, 10000); 
};

const checkBotStatus = async () => {
  try {
    // getMe — самый надежный способ проверить токен и связь
    const me = await bot.telegram.getMe();
    const groupId = await getActiveGroupId();
    
    return {
      online: true,
      botName: me.username,
      hasGroup: !!groupId,
      error: null
    };
  } catch (err) {
    return {
      online: false,
      botName: null,
      hasGroup: false,
      error: err.message
    };
  }
};

const sendToGroup = async (message) => {
  try {
    const groupId = await getActiveGroupId();
    if (!groupId) throw new Error("Группа не привязана в настройках");

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Превышено время ожидания Telegram (Timeout)")), 5000)
    );

    await Promise.race([
      bot.telegram.sendMessage(groupId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      timeout
    ]);
    
    return true;
  } catch (err) {
    // Пробрасываем ошибку выше, чтобы роут её поймал
    throw new Error(err.message || "Ошибка API Telegram");
  }
};

// Запуск бота
bot.launch().then(() => {
  console.log('🚀 Telegram бот успешно запущен');
}).catch((err) => {
  console.error('❌ ОШИБКА: Telegram бот не смог запуститься:', err.message);
  console.log('Сервер продолжит работу без уведомлений.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { 
  sendToGroup, 
  startPairing, 
  stopPairing, 
  isPairing: () => isPairing,
  initTelegramBot,
  leaveCurrentGroup,
  queueNotification,
  checkBotStatus
};