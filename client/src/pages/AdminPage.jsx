import { useState, useEffect, useRef } from 'react';
import axios, { socket } from '../api'; 
import { Shield, Loader2 } from 'lucide-react';

// Импорт компонентов (убедись, что файлы созданы в папке components)
import AdminUsers from '../components/AdminUsers';
import AdminChannels from '../components/AdminChannels';
import AdminSettings from '../components/AdminSettings';
import UserModal from '../components/UserModal';
import PageStatus from '../components/PageStatus';

export default function AdminPage() {
  // --- СОСТОЯНИЯ ДАННЫХ ---
  const [activeTab, setActiveTab] = useState('users'); 
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [settings, setSettings] = useState([]);
  const [proxy, setProxy] = useState('');
  
  // --- ИНТЕРФЕЙС ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userModal, setUserModal] = useState({ open: false, data: null });
  const [now, setNow] = useState(new Date());
  const [tgStatus, setTgStatus] = useState({ loading: false, data: null });
  const [isStartingBot, setIsStartingBot] = useState(false);

  // --- ЗАГРУЗКА ДАННЫХ ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, c, s] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/channels'),
        api.get('/api/admin/settings')
      ]);
      
      setUsers(u.data);
      setChannels(c.data);
      setSettings(s.data);
      
      // Ищем прокси в настройках
      const proxySetting = s.data.find(i => i.key === 'proxy_url');
      if (proxySetting) setProxy(proxySetting.value);
      
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Не удалось загрузить данные администратора");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 1. Таймер для обновления относительного времени (напр. "5м назад")
    const timer = setInterval(() => setNow(new Date()), 60000);

    // 2. Слушатель сокетов для статусов "В сети"
    socket.on('status_change', (data) => {
      setUsers(prev => prev.map(u => 
        u.id === Number(data.userId) ? { ...u, isOnline: data.online, lastActive: data.lastActive || u.lastActive } : u
      ));
    });

    // 3. Слушатель для авто-привязки Telegram группы
    socket.on('settings_updated', (data) => {
      if (data.key === 'tg_group_id') {
        fetchData(); // Перезагружаем, чтобы обновить статус на "Подключено"
      }
    });

    return () => {
      clearInterval(timer);
      socket.off('status_change');
      socket.off('settings_updated');
    };
  }, []);

  // --- ЛОГИКА ПОЛЬЗОВАТЕЛЕЙ ---
  const handleSaveUser = async (formData) => {
    try {
      if (userModal.data) {
        await api.patch(`/api/admin/users/${userModal.data.id}`, formData);
      } else {
        await api.post('/api/admin/users', formData);
      }
      setUserModal({ open: false, data: null });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка при сохранении пользователя");
    }
  };

  // --- ЛОГИКА КАНАЛОВ ---
  const handleAddChannel = async (name) => {
    try {
      await api.post('/api/admin/channels', { name });
      fetchData();
    } catch (err) {
      alert("Ошибка при создании канала");
    }
  };

  const updateChannel = async (id, data) => {
    try {
      await api.patch(`/api/admin/channels/${id}`, data);
      // Не вызываем fetchData для плавной работы инпутов (onBlur)
    } catch (err) {
      console.error("Update channel error");
    }
  };

  // --- ЛОГИКА НАСТРОЕК (PROXY / TELEGRAM) ---
  const saveProxy = async () => {
    try {
      await api.post('/api/admin/settings', { key: 'proxy_url', value: proxy });
      alert("Настройки прокси сохранены");
    } catch (err) {
      alert("Ошибка сохранения прокси");
    }
  };

  const checkTelegram = async () => {
    setTgStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.get('/api/admin/tg-status');
      setTgStatus({ loading: false, data: res.data });
    } catch (err) {
      setTgStatus({ loading: false, data: { online: false, error: "Нет связи с ботом" } });
    }
  };

  const handleStartPairing = async () => {
    setIsStartingBot(true);
    try {
      await api.post('/api/admin/tg-start-pairing');
      await checkTelegram(); // Обновляем статус, чтобы увидеть "Бот ищет группу"
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка запуска бота");
    } finally {
      setIsStartingBot(false);
    }
  };

  const sendTestMsg = async () => {
    try {
      await api.post('/api/admin/tg-test');
      alert("Тестовое сообщение отправлено!");
    } catch (err) {
      alert("Ошибка: " + (err.response?.data?.error || "Не удалось отправить"));
    }
  };

  const handleResetTg = async () => {
    if (!confirm("Отвязать бота от группы? Он выйдет из чата автоматически.")) return;
    try {
      await api.post('/api/admin/tg-reset');
      fetchData();
    } catch (err) {
      alert("Ошибка при сбросе");
    }
  };

  // --- УНИВЕРСАЛЬНОЕ УДАЛЕНИЕ ---
  const deleteItem = async (type, id) => {
    if (!confirm("Удалить безвозвратно?")) return;
    try {
      const endpoint = type === 'users' ? `/api/admin/users/${id}` : `/api/admin/channels/${id}`;
      await api.delete(endpoint);
      fetchData();
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  // Проверка статуса для PageStatus
  if (loading && isInitialLoading(users, channels)) {
    return <PageStatus loading={true} error={error} onRetry={fetchData} />;
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 font-['Inter']">
      
      {/* HEADER */}
      <header className="pt-10 mb-8 px-1 animate-in fade-in duration-700">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Админ-центр
        </h1>
        <p className="text-sm md:text-base text-slate-500 font-medium mt-2 leading-relaxed">
          Управление доступом, конфигурация каналов и системные настройки Clipsio.
        </p>
      </header>

      {/* TABS */}
      <div className="sticky top-0 lg:top-0 max-lg:top-[64px] z-40 bg-slate-50/95 dark:bg-[#0a0f1c]/95 backdrop-blur-md -mx-4 px-4 pt-4 pb-4 border-b dark:border-slate-800 transition-all">
        <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 shadow-inner">
          <TabBtn label="Сотрудники" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <TabBtn label="Каналы" active={activeTab === 'channels'} onClick={() => setActiveTab('channels')} />
          <TabBtn label="Настройки" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </div>

      <div className="mt-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* ВКЛАДКА: СОТРУДНИКИ */}
        {activeTab === 'users' && (
          <AdminUsers 
            users={users} 
            now={now} 
            onEdit={(u) => setUserModal({ open: true, data: u })} 
            onDelete={deleteItem}
            onAdd={() => setUserModal({ open: true, data: null })}
          />
        )}

        {/* ВКЛАДКА: КАНАЛЫ */}
        {activeTab === 'channels' && (
          <AdminChannels 
            channels={channels} 
            onAdd={handleAddChannel} 
            onDelete={deleteItem} 
            onUpdate={updateChannel} 
          />
        )}

        {/* ВКЛАДКА: НАСТРОЙКИ */}
        {activeTab === 'settings' && (
          <AdminSettings 
            proxy={proxy}
            setProxy={setProxy}
            onSaveProxy={saveProxy}
            settings={settings}
            tgStatus={tgStatus}
            onCheckTg={checkTelegram}
            onStartPairing={handleStartPairing}
            isStartingBot={isStartingBot}
            onResetTg={handleResetTg}
            onSendTest={sendTestMsg}
          />
        )}
      </div>

      {/* МОДАЛКА ПОЛЬЗОВАТЕЛЯ */}
      {userModal.open && (
        <UserModal 
          user={userModal.data} 
          onClose={() => setUserModal({ open: false, data: null })} 
          onSave={handleSaveUser} 
        />
      )}
    </div>
  );
}

// Вспомогательные функции/компоненты
function isInitialLoading(users, channels) {
  return users.length === 0 && channels.length === 0;
}

function TabBtn({ label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
        active ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
      }`}
    >
      {label}
    </button>
  );
}