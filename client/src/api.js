import axiosLib from 'axios';
import { io } from 'socket.io-client';

const api = axiosLib.create({
  baseURL: '',
});

api.isCancel = axiosLib.isCancel;

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const socket = io({
  path: '/socket.io',
});

export const getDownloadUrl = (filePath, fileName) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({
    path: filePath,
    token: token || '',
    name: fileName || 'video.mp4'
  });
  return `/api/tasks/download-file?${params.toString()}`;
};

// Функция для скачивания файла как Blob
export const fetchFileAsBlob = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Ошибка загрузки');
  return await response.blob();
};

export async function subscribeUserToPush() {
  // Проверка: поддерживаются ли вообще сервис-воркеры и уведомления
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push-уведомления не поддерживаются этим браузером");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = 'BJOKOTJYP_yKaTE_y1PT5LJ5xIOhNu1pDe4SQxZpYKuBsSVNspTDSGOUFjoPpeVG1z-Diz2SnbXb7BSsjiudkNs';
      const padding = '='.repeat((4 - publicKey.length % 4) % 4);
      const base64 = (publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
      });
    }

    await api.post('/api/auth/subscribe', subscription.toJSON());
    return true;
  } catch (err) {
    console.error("Ошибка при подписке на пуши:", err);
    return false;
  }
}

export const getNotifications = (skip = 0, take = 15) => api.get(`/api/tasks/notifications?skip=${skip}&take=${take}`);
export const markNotifRead = (id) => api.post(`/api/tasks/notifications/${id}/read`);
export const getPreferences = () => api.get('/api/tasks/notifications/preferences');
export const updatePreferences = (data) => api.patch('/api/tasks/notifications/preferences', data);

export default api;