// client/src/pages/CreatorPage.jsx
import { useEffect, useState, useRef } from 'react';
import api from '../api';
import { Loader2, Zap, X, Calendar, List } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import UploadModal from '../components/UploadModal';
import VideoModal from '../components/VideoModal';
import PageStatus from '../components/PageStatus';

export default function CreatorPage() {
  const [tasks, setTasks] = useState([]); // Текущий список задач для выбранного таба
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [tab, setTab] = useState('my'); 
  
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Для первого входа
  const [isRefreshing, setIsRefreshing] = useState(false);        // Для смены вкладок
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [activePreview, setActivePreview] = useState(null); 
  
  // Пагинация
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [alerts, setAlerts] = useState({ my: false, available: false, history: false });
  const isFetchingRef = useRef(false);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    isFetchingRef.current = false;
    initPage();
  }, [tab, selectedChannel]);

  // 1. Инициализация (сброс и первая загрузка)
  const initPage = async () => {
    if (!isInitialLoading) setIsRefreshing(true);
    setError(null);
    setHasMore(true);

    try {
      const endpoint = tab === 'my' ? 'my-work' : tab === 'available' ? 'available' : 'history';
      const url = `/api/tasks/${endpoint}?skip=0&take=${ITEMS_PER_PAGE}&channelId=${selectedChannel}`;
      
      // Грузим задачи, каналы и статусы алертов одновременно
      const [tasksRes, chanRes, alertsRes] = await Promise.all([
        api.get(url),
        api.get('/api/channels'),
        api.get('/api/tasks/alerts-status') // Запрос алертов
      ]);

      setTasks(tasksRes.data);
      setChannels(chanRes.data);
      setAlerts(alertsRes.data); // Сохраняем алерты
      setHasMore(tasksRes.data.length === ITEMS_PER_PAGE);
    } catch (err) {
      setError("Не удалось загрузить данные");
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  };

  // 2. Подгрузка при скролле
  const fetchMore = async () => {
    // 1. Мгновенная проверка "замка"
    if (isFetchingRef.current || !hasMore || tab === 'my') return;
    
    // 2. Мгновенная блокировка
    isFetchingRef.current = true;
    setIsFetchingMore(true); // Это оставляем для UI (показа лоадера)

    try {
      const endpoint = tab === 'available' ? 'available' : 'history';
      const url = `/api/tasks/${endpoint}?skip=${tasks.length}&take=${ITEMS_PER_PAGE}&channelId=${selectedChannel}`;

      const res = await api.get(url);
      const newTasks = res.data;

      if (newTasks.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      setTasks(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const uniqueNew = newTasks.filter(t => !existingIds.has(t.id));
        return [...prev, ...uniqueNew];
      });
    } catch (err) {
      console.error("Ошибка подгрузки:", err);
    } finally {
      // 3. Снимаем блокировку только после завершения
      isFetchingRef.current = false;
      setIsFetchingMore(false);
    }
  };

  const handleCancelUpload = async (id) => {
    if (!confirm("Отозвать видео с проверки?")) return;
    try {
      await api.post(`/api/tasks/${id}/cancel-upload`);
      initPage(); // Перезагружаем текущую вкладку
    } catch (err) { alert("Ошибка"); }
  };

  const handleOpenPreview = (task, type = 'original') => {
    const url = type === 'original' ? `/${task.originalVideo.filePath}` : `/${task.reactionFilePath}`;
    setActivePreview({ url, title: task.originalVideo.title, channel: task.channel?.name });
  };

  // 3. Группировка (теперь работает с плоским массивом tasks)
  const getGroupedTasks = () => {
    const groups = {};
    tasks.forEach(task => {
      const date = new Date(task.updatedAt).toLocaleDateString('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    });
    return groups;
  };

  if (loading || error) return <PageStatus loading={loading} error={error} onRetry={initPage} />;

  if (isInitialLoading) {
    return <PageStatus loading={true} error={error} onRetry={initPage} />;
  }

  const groupedTasks = getGroupedTasks();

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 font-['Inter']">
      
      {/* HEADER */}
      <header className="pt-10 mb-8 px-1 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Рабочая панель
              </h1>
            </div>
            
            {/* ФИКС: min-h-[40px] резервирует место под 2 строки текста, чтобы контент не прыгал */}
            <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[40px] flex items-center">
              {tab === 'my' && "Загрузите готовые реакции на проверку."}
              {tab === 'available' && "Выберите новое видео в работу."}
              {tab === 'history' && "Архив ваших выполненных задач и статусы их публикации."}
            </p>
          </div>
        </div>
      </header>

      {/* STICKY NAVIGATION */}
      <div className="sticky top-0 lg:top-0 max-lg:top-[64px] z-40 bg-slate-50 dark:bg-[#0a0f1c] -mx-4 px-4 pt-4 pb-4 border-b dark:border-slate-800 transition-all">
        <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 mb-5 shadow-inner">
          <TabBtn 
            label="В процессе" 
            active={tab === 'my'} 
            onClick={() => setTab('my')} 
            loading={isRefreshing && tab === 'my'} 
            hasBadge={alerts.my} // ТОЧКА ТУТ
          />
          <TabBtn 
            label="Свободные" 
            active={tab === 'available'} 
            onClick={() => setTab('available')} 
            loading={isRefreshing && tab === 'available'} 
            hasBadge={alerts.available} // ТОЧКА ТУТ
          />
          <TabBtn 
            label="История" 
            active={tab === 'history'} 
            onClick={() => setTab('history')} 
            loading={isRefreshing && tab === 'history'} 
            hasBadge={alerts.history} // ТОЧКА ТУТ
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <FilterBtn label="Все каналы" active={selectedChannel === 'all'} onClick={() => setSelectedChannel('all')} />
          {channels.map(ch => (
            <FilterBtn key={ch.id} label={ch.name} active={selectedChannel === ch.id} onClick={() => setSelectedChannel(ch.id)} />
          ))}
        </div>
      </div>

      {/* LIST CONTENT */}
      <div className={`relative mt-8 space-y-12 transition-all duration-200 ${isRefreshing ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}>
        {tasks.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed dark:border-slate-800 rounded-[2rem]">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest opacity-50">Здесь пока пусто</p>
          </div>
        ) : (
          <>
            {Object.keys(groupedTasks).map(date => (
              <div key={date} className="space-y-5">
                <div className="flex items-center gap-4 px-2 opacity-60">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{date}</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />
                </div>
                <div className="space-y-4">
                  {groupedTasks[date].map(task => (
                    <TaskCard 
                      key={task.id} task={task} mode={tab}
                      onPreview={handleOpenPreview}
                      onUpload={() => setUploadTarget(task)}
                      onClaim={() => api.post(`/api/tasks/${task.id}/claim`).then(initPage)}
                      onAbandon={() => confirm("Отказаться?") && api.post(`/api/tasks/${task.id}/abandon`).then(initPage)}
                      onCancelUpload={handleCancelUpload}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Блок подгрузки в самом низу */}
            {(tab === 'available' || tab === 'history') && (
              <div className="pt-10 pb-20 flex flex-col items-center">
                {hasMore ? (
                  <div 
                    ref={(el) => {
                      if (!el) return;
                      // Создаем наблюдатель только если мы НЕ в процессе загрузки
                      const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && !isFetchingMore && hasMore) {
                          fetchMore();
                          // Отключаем этот конкретный наблюдатель сразу после срабатывания
                          observer.unobserve(el); 
                        }
                      }, { threshold: 0.1 });
                      observer.observe(el);
                    }}
                    className="h-10 flex items-center justify-center"
                  >
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                  </div>
                ) : tasks.length > 0 && (
                  <div className="flex flex-col items-center gap-2 opacity-20 py-10">
                    <div className="h-10 w-px bg-slate-400 mb-2" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
                      Это всё, что мы нашли
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {activePreview && <VideoModal {...activePreview} onClose={() => setActivePreview(null)} />}
      {uploadTarget && <UploadModal task={uploadTarget} onClose={() => setUploadTarget(null)} onSuccess={() => { setUploadTarget(null); initPage(); }} />}
    </div>
  );
}

function TabBtn({ label, active, onClick, hasBadge, loading }) {
  return (
    <button 
      onClick={onClick} 
      disabled={loading}
      // h-11 и flex-shrink-0 заставляют кнопку быть статичной
      className={`relative flex-1 h-11 flex-shrink-0 flex items-center justify-center rounded-xl text-[13px] font-bold transition-all duration-200
        ${active 
          ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}
      `}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Используем абсолютное позиционирование для лоадера, чтобы он не выталкивал текст в момент смены */}
        {loading ? (
          <Loader2 className="animate-spin text-blue-600" size={16} strokeWidth={2.5} />
        ) : (
          <span className="truncate">{label}</span>
        )}
      </div>

      {hasBadge && !loading && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white dark:border-slate-900"></span>
        </span>
      )}
    </button>
  );
}

function FilterBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-5 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'}`}>
      {label}
    </button>
  );
}