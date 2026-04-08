// server/push.js
const webpush = require('web-push');
const prisma = require('./db');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sendPushNotification = async (userId, payload) => {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: parseInt(userId) }
  });

  const notifications = subscriptions.map(sub => {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh }
    };

    return webpush.sendNotification(pushConfig, JSON.stringify(payload))
      .catch(err => {
        if (err.statusCode === 410) {
          // Если подписка протухла — удаляем из базы
          return prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        console.error("Ошибка пуша:", err.message);
      });
  });

  await Promise.all(notifications);
};

module.exports = { sendPushNotification };