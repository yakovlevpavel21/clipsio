// client/src/pages/ManagerPage.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import api, { socket } from '../api';
import { 
  Plus, List, Calendar, X, Loader2, CheckCircle2, 
  Clock, Send, Zap, Filter, Sparkles, Search 
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Компоненты
import PageStatus from '../components/PageStatus';
import TaskCardManager from '../components/TaskCardManager';
import AddTaskModal from '../components/AddTaskModal';
import PublishModal from '../components/PublishModal';
import VideoModal from '../components/VideoModal';
import EditTaskModal from '../components/EditTaskModal';

export default function ManagerPage() {
  // --- СОСТОЯНИЯ ДАННЫХ ---
  const [tasks, setTasks] = useState([]);
  const [channels, setChannels] = useState([]);
  const [creators, setCreators] = useState([]);
  const [alerts, setAlerts] = useState({ active: false, published: false });
  
  // --- СОСТОЯНИЯ ЗАГРУЗКИ ---
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false); // Для PageStatus
  const [error, setError] = useState(null);

  // --- ФИЛЬТРЫ И ПАГИНАЦИЯ ---
  const [tab, setTab] = useState('active'); 
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const ITEMS_PER_PAGE = 10;

  // --- МОДАЛЬНЫЕ ОКНА ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);
  const [selectedTaskForPublish, setSelectedTaskForPublish] = useState(null);
  const [activePreview, setActivePreview] = useState(null);

  const location = useLocation();

  // 1. ПЕРВИЧНАЯ И ПОЛНАЯ ЗАГРУЗКА (При смене таба или фильтра)
  const initPage = async () => {
    // Отменяем предыдущий запрос, если он еще идет
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Блокируем новые запросы подгрузки
    isFetchingRef.current = true;
    
    if (!isInitialLoading) setIsRefreshing(true);
    setError(null);
    setHasMore(true);
    setTasks([]); // Очищаем список для "чистого" перехода

    try {
      const url = `/api/tasks/managed?skip=0&take=${ITEMS_PER_PAGE}&tab=${tab}&channelId=${selectedChannel}`;
      
      const [tasksRes, chanRes, creatorsRes, alertsRes] = await Promise.all([
        api.get(url, { signal: abortControllerRef.current.signal }),
        api.get('/api/channels', { signal: abortControllerRef.current.signal }),
        api.get('/api/tasks/creators', { signal: abortControllerRef.current.signal }),
        api.get('/api/tasks/alerts-status', { signal: abortControllerRef.current.signal })
      ]);

      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setChannels(Array.isArray(chanRes.data) ? chanRes.data : []);
      setCreators(Array.isArray(creatorsRes.data) ? creatorsRes.data : []);
      setAlerts(alertsRes.data || { active: false, published: false });
      
      setHasMore(tasksRes.data.length === ITEMS_PER_PAGE);
    } catch (err) {
      if (api.isCancel(err)) return;
      console.error("Fetch error:", err);
      setError("Не удалось загрузить данные сервера");
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setLoading(false);
      isFetchingRef.current = false; // Снимаем блок
    }
  };

  useEffect(() => {
    initPage();
  }, [tab, selectedChannel]);

  useEffect(() => {
    if (location.state?.targetTab) {
      setTab(location.state.targetTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state?.scrollToTaskId && tasks.length > 0) {
      const taskId = location.state.scrollToTaskId;
      
      setTimeout(() => {
        const element = document.getElementById(`task-${taskId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-4');
          setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-4'), 3000);
        }
      }, 600);
    }
  }, [location.state, tasks]);

  // 2. ПОДГРУЗКА ДАННЫХ ПРИ СКРОЛЛЕ
  const fetchMoreTasks = async () => {
    // ЗАЩИТА 1: Если уже грузим, если сброс, если данных нет, или если список пуст — ВЫХОДИМ
    if (isFetchingRef.current || !hasMore || isRefreshing || tasks.length === 0) return;
    
    isFetchingRef.current = true;
    setIsFetchingMore(true);

    try {
      const currentLength = tasks.length;
      const url = `/api/tasks/managed?skip=${currentLength}&take=${ITEMS_PER_PAGE}&tab=${tab}&channelId=${selectedChannel}`;
      
      const res = await api.get(url);
      const newTasks = res.data;

      // ЗАЩИТА 2: Если пришел пустой массив или меньше лимита — отключаем пагинацию навсегда для этого таба
      if (!newTasks || newTasks.length === 0) {
        setHasMore(false);
        isFetchingRef.current = false; // Разблокируем, но так как hasMore false, больше не зайдем
        setIsFetchingMore(false);
        return;
      }

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
      isFetchingRef.current = false;
      setIsFetchingMore(false);
    }
  };

  // 3. УДАЛЕНИЕ ЗАДАЧИ
  const handleDeleteTask = async (id) => {
    if (!window.confirm("Удалить задачу безвозвратно?")) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      // Локально удаляем из списка, чтобы не перезагружать всё
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  // 4. ОПТИМИЗИРОВАННАЯ ГРУППИРОВКА (useMemo)
  const groupedTasks = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const date = new Date(task.createdAt).toLocaleDateString('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    });
    return groups;
  }, [tasks]);

  // 5. ПРЕДПРОСМОТР ВИДЕО
  const handleOpenPreview = (task, type = 'original') => {
    const url = type === 'original' 
      ? `/${task.originalVideo.filePath}`
      : `/${task.reactionFilePath}`;
    setActivePreview({ url, title: task.originalVideo.title, channel: task.channel.name });
  };

  // --- РЕНДЕР СОСТОЯНИЙ ЗАГРУЗКИ ---
  if (isInitialLoading) {
    return <PageStatus loading={true} error={error} onRetry={initPage} />;
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 font-['Inter']">
      
      {/* HEADER */}
      <header className="pt-10 mb-8 px-1 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Управление контентом
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[40px] flex items-center">
              {tab === 'active' && "Контролируйте процесс создания: от ленты до готовых реакций."}
              {tab === 'published' && "Архив опубликованных видео и статистика их размещения."}
            </p>
          </div>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
          >
            <Plus size={18} /> Добавить видео
          </button>
        </div>
      </header>

      {/* STICKY NAVIGATION & FILTERS */}
      <div className="sticky top-0 lg:top-0 max-lg:top-[64px] z-40 bg-slate-50 dark:bg-[#0a0f1c] -mx-4 px-4 pt-4 pb-4 border-b dark:border-slate-800 transition-all">
        <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 mb-5 shadow-inner">
          <TabBtn 
            label="В очереди" 
            active={tab === 'active'} 
            onClick={() => setTab('active')} 
            loading={isRefreshing && tab === 'active'}
            hasBadge={alerts.active} 
          />
          <TabBtn 
            label="Опубликовано" 
            active={tab === 'published'} 
            onClick={() => setTab('published')} 
            loading={isRefreshing && tab === 'published'}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <FilterBtn 
            label="Все каналы" 
            active={selectedChannel === 'all'} 
            onClick={() => setSelectedChannel('all')} 
          />
          {channels.map(ch => (
            <FilterBtn 
              key={ch.id} 
              label={ch.name} 
              active={selectedChannel === ch.id} 
              onClick={() => setSelectedChannel(ch.id)} 
            />
          ))}
        </div>
      </div>

      {/* --- LIST CONTENT --- */}
      <div className={`mt-8 space-y-12 transition-all duration-300 ${isRefreshing ? 'opacity-0' : 'opacity-100'}`}>
        {tasks.length === 0 && !isRefreshing ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest opacity-50">Задач не найдено</p>
          </div>
        ) : (
          <>
            {/* Группировка и отрисовка */}
            {Object.keys(groupedTasks).map(date => (
              <div key={date} className="space-y-5">
                <div className="flex items-center gap-4 px-2 opacity-60">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{date}</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />
                </div>
                <div className="space-y-4">
                  {groupedTasks[date].map(task => (
                    <TaskCardManager 
                      key={task.id} 
                      task={task} 
                      onPreview={handleOpenPreview}
                      onPublish={() => setSelectedTaskForPublish(task)}
                      onEdit={(t) => { setSelectedTaskForEdit(t); setIsEditModalOpen(true); }}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* БЛОК ПОДГРУЗКИ */}
            <div className="pt-10 pb-20 flex flex-col items-center justify-center">
              {hasMore ? (
                <div 
                  ref={(el) => {
                    // ЗАЩИТА 3: Если лоадер появился, но мы уже грузим или данных нет — игнорируем
                    if (!el || isFetchingRef.current || !hasMore || isRefreshing) return;

                    const observer = new IntersectionObserver((entries) => {
                      if (entries[0].isIntersecting) {
                        // Как только увидели лоадер — СРАЗУ отключаем этот наблюдатель
                        observer.unobserve(el);
                        fetchMoreTasks();
                      }
                    }, { 
                      threshold: 0.1, // Срабатывает, как только показался хотя бы край (10%)
                      rootMargin: '100px' // Начинаем грузить чуть заранее (за 100px до края)
                    });
                    observer.observe(el);
                  }}
                  className="h-10 flex items-center justify-center"
                >
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
              ) : (
                tasks.length > 0 && (
                  <div className="flex flex-col items-center gap-2 opacity-20 py-10">
                    <div className="h-10 w-px bg-slate-400 mb-2" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
                      Это всё, что мы нашли
                    </p>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* --- MODALS --- */}
      {isAddModalOpen && (
        <AddTaskModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => { setIsAddModalOpen(false); initPage(); }} 
          channels={channels} 
        />
      )}

      {isEditModalOpen && (
        <EditTaskModal 
          task={selectedTaskForEdit} 
          creators={creators} 
          onClose={() => setIsEditModalOpen(false)} 
          onSuccess={() => { setIsEditModalOpen(false); initPage(); }} 
        />
      )}
      
      {selectedTaskForPublish && (
        <PublishModal 
          task={selectedTaskForPublish} 
          onClose={() => setSelectedTaskForPublish(null)} 
          onSuccess={() => { setSelectedTaskForPublish(null); initPage(); }} 
        />
      )}
      
      {activePreview && (
        <VideoModal {...activePreview} onClose={() => setActivePreview(null)} />
      )}
    </div>
  );
}

// --- ВНУТРЕННИЕ UI КОМПОНЕНТЫ ---

function TabBtn({ label, active, onClick, hasBadge, loading }) {
  return (
    <button 
      onClick={onClick} 
      disabled={loading} 
      className={`relative flex-1 h-11 flex items-center justify-center rounded-xl text-[13px] font-bold transition-all ${active ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
    >
      <div className="relative flex items-center justify-center w-full h-full">
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
    <button 
      onClick={onClick} 
      className={`px-5 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400 dark:hover:border-slate-600'}`}
    >
      {label}
    </button>
  );
}