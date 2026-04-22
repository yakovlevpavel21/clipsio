import { useEffect, useState, useCallback, useRef } from 'react';
import api, { socket, getDownloadUrl } from '../api';
import { Loader2, Plus, Layers, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import  {useNavigate, useLocation } from 'react-router-dom';

// Компоненты
import FilterBar from '../components/content/FilterBar';
import DesktopTable from '../components/content/DesktopTable';
import MobileList from '../components/content/MobileList';
import BottomSheet from '../components/content/BottomSheet';
import TaskHistoryModal from '../components/content/TaskHistoryModal';

// Модалки
import PageStatus from '../components/PageStatus';
import UploadModal from '../components/UploadModal';
import VideoModal from '../components/VideoModal';
import AddTaskModal from '../components/AddTaskModal';
import EditTaskModal from '../components/content/EditTaskModal';
import PublishModal from '../components/PublishModal';

export default function ContentPage() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')));
  const [tasks, setTasks] = useState([]);
  const [channels, setChannels] = useState([]);
  const [creators, setCreators] = useState([]);
  const [filters, setFilters] = useState({ channelId: 'all', status: 'all', creatorId: 'all' });
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [highlightedId, setHighlightedId] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Стейты для Pull-to-Refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  // Модалки
  const [uploadTarget, setUploadTarget] = useState(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);
  const [activePreview, setActivePreview] = useState(null);
  const [bottomSheetTask, setBottomSheetTask] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER' || isAdmin;
  const observer = useRef();

  const navigate = useNavigate(); 
  const location = useLocation();
  const highlightTimerRef = useRef(null);

  const loadData = async (skip = 0, reset = false) => {
    if (reset && tasks.length === 0) setIsInitialLoading(true);
    else if (reset) setIsRefreshing(true);
    else setIsFetchingMore(true);

    try {
      const res = await api.get('/api/tasks/content', { params: { skip, take: 20, ...filters } });
      setTasks(prev => reset ? res.data : [...prev, ...res.data]);
      setHasMore(res.data.length === 20);
    } catch (e) { setError("Не удалось загрузить контент"); console.log(e);}
    finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
      setPullDistance(0);
    }
  };

  const triggerHighlight = (id) => {
    // Очищаем старый таймер, если он был
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    
    setHighlightedId(id);
    
    // Убираем через 3 секунды
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedId(null);
      highlightTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => { loadData(0, true); }, [filters]);
  
  useEffect(() => { 
    api.get('/api/channels').then(res => setChannels(res.data));
    if (isManager) api.get('/api/tasks/creators').then(res => setCreators(res.data));
  }, [isManager]);

  // 2. Эффект скролла из уведомлений
  useEffect(() => {
    const targetTaskId = location.state?.scrollToTaskId;
    
    // Если нет ID или данные еще загружаются — выходим
    if (!targetTaskId || isInitialLoading || tasks.length === 0) return;

    let attempts = 0;
    const maxAttempts = 10;

    const tryScroll = () => {
      const element = document.getElementById(`task-${targetTaskId}`);
      
      if (element) {
        // 1. Скроллим
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 2. Подсвечиваем
        triggerHighlight(targetTaskId);
        
        // 3. Очищаем состояние навигации ТУТ, когда всё успешно сработало
        navigate(location.pathname, { replace: true, state: {} });
      } else if (attempts < maxAttempts) {
        // Если элемента еще нет в DOM, пробуем еще раз через 100мс
        attempts++;
        setTimeout(tryScroll, 100);
      }
    };

    tryScroll();

  }, [location.state?.scrollToTaskId, isInitialLoading, tasks.length]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      // Если меню открыто и клик произошел НЕ по кнопке "три точки"
      // (используем .closest для проверки, что клик не внутри кнопки)
      if (activeDropdownId && !e.target.closest('.dots-menu-button')) {
        setActiveDropdownId(null);
      }
    };

    // Добавляем слушатель только когда меню открыто
    if (activeDropdownId) {
      window.addEventListener('click', handleOutsideClick);
    }

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [activeDropdownId]);

  // --- ОБРАБОТКА СВАЙПА ---
  const handleTouchStart = (e) => {
    // Начинаем отслеживание только если мы в самом верху
    if (window.scrollY <= 0) {
      setTouchStart(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e) => {
    if (touchStart === 0 || window.scrollY > 0 || isRefreshing) return;

    const touchY = e.touches[0].pageY;
    const diff = touchY - touchStart;
    
    if (diff > 0) {
      // Линейная зависимость 0.5 дает более быстрый отклик, чем степени
      const move = Math.min(diff * 0.5, 80); 
      setPullDistance(move);
      
      // Предотвращаем стандартный скролл браузера при потягивании
      if (diff > 10 && e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    // Порог срабатывания снижен до 50 для быстроты
    if (pullDistance >= 50) {
      loadData(0, true);
    } else {
      setPullDistance(0);
    }
    setTouchStart(0);
  };

  const handleDownload = async (task, type = 'original') => {
    const path = type === 'original' ? task.originalVideo?.filePath : task.reactionFilePath;
    if (!path) return alert("Файл не найден");
    
    const videoFileName = `${task.originalVideo.videoId}_${type}.mp4`;
    const url = window.location.origin + getDownloadUrl(path, videoFileName);
    
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    // Если это iPhone и приложение запущено как PWA (на рабочем столе)
    if (isIOS && isStandalone) {
      setIsDownloading(true);
      
      // Пытаемся вызвать нативный Share Sheet (самый удобный способ)
      try {
        // Ставим лимит на ожидание загрузки (например, 4 секунды)
        // Если файл качается дольше, iOS может заблокировать окно "Поделиться"
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const blob = await response.blob();
        const file = new File([blob], videoFileName, { type: 'video/mp4' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          setIsDownloading(false);
          return; // Если успешно поделились — выходим
        }
      } catch (err) {
        console.log("Share sheet failed or timeout, falling back to Browser View");
      }

      // --- ФОЛЛБЕК ДЛЯ ПОЯВЛЕНИЯ КНОПОК БРАУЗЕРА ---
      // Если Share Sheet не сработал или файл слишком большой
      setIsDownloading(false);

      // Хитрость: window.open с параметром 'noreferrer' и '_blank' 
      // в PWA на iOS часто вызывает именно In-App Safari с кнопками "Готово" и панелью навигации
      const win = window.open(url, '_blank', 'noreferrer');
      
      // Если всплывающее окно заблокировано
      if (!win) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.click();
      }
    } else {
      // Обычная логика для Android и ПК
      const link = document.createElement('a');
      link.href = url;
      link.download = videoFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 3. Обновление через сокеты
  useEffect(() => {
    const handleTaskUpdate = (updatedTask) => {
      const isRelevant = isAdmin || 
        (user.role === 'MANAGER' && updatedTask.managerId === user.id) || 
        (user.role === 'CREATOR' && updatedTask.creatorId === user.id);

      if (!isRelevant) return;

      setTasks(prev => {
        const exists = prev.find(t => t.id === updatedTask.id);
        const updatedList = exists 
          ? prev.map(t => t.id === updatedTask.id ? updatedTask : t)
          : [updatedTask, ...prev];

        return [...updatedList].sort((a, b) => {
          const timeA = new Date(a.scheduledAt || a.createdAt).getTime();
          const timeB = new Date(b.scheduledAt || b.createdAt).getTime();
          return timeB - timeA;
        });
      });

      // Включаем подсветку для обновленной задачи
      triggerHighlight(updatedTask.id);
    };

    socket.on('task_updated', handleTaskUpdate);
    return () => {
      socket.off('task_updated');
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [user.id, isAdmin]);

  const lastElementRef = useCallback(node => {
    if (isFetchingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadData(tasks.length);
    });
    if (node) observer.current.observe(node);
  }, [isFetchingMore, hasMore, tasks.length]);

  if (isInitialLoading) {
    return <PageStatus loading={true} />;
  }

  if (error) {
    return <PageStatus error={error} onRetry={() => loadData(0, true)} />;
  } 

  return (
    <div 
      className="w-full min-h-screen bg-white dark:bg-[#1f1f1f] transition-colors duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. ИНДИКАТОР ОБНОВЛЕНИЯ: Теперь fixed и не ломает sticky */}
      <div 
        className="fixed left-0 right-0 z-[120] flex justify-center pointer-events-none"
        style={{ 
          // Начинаем чуть выше (60px), чтобы он был спрятан под хедером
          top: '60px', 
          // pullDistance плавно выталкивает его вниз
          transform: `translateY(${pullDistance}px)`, 
          // Появляется сразу, как только начали тянуть (>5px)
          opacity: pullDistance > 5 || isRefreshing ? 1 : 0,
          // Плавный возврат только когда палец отпущен (pullDistance === 0)
          transition: pullDistance === 0 ? 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'opacity 0.2s ease'
        }}
      >
        <div className="bg-white dark:bg-[#282828] p-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 dark:border-[#444444] flex items-center justify-center">
          <RefreshCw 
            className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} 
            size={18} 
            // Вращение иконки при натяжении
            style={{ transform: isRefreshing ? 'none' : `rotate(${pullDistance * 6}deg)` }} 
          />
        </div>
      </div>

      {/* 2. HEADER (Desktop) */}
      <div className="hidden min-[850px]:block px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between text-slate-900 dark:text-white">
          <h1 className="text-2xl font-bold tracking-tight uppercase">Контент</h1>
          {isManager && (
            <button onClick={() => setAddTaskOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-bold text-xs uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
              <Plus size={18} /> Создать
            </button>
          )}
        </div>
      </div>

      {/* 3. FILTER BAR: Теперь sticky будет работать идеально */}
      <FilterBar 
        filters={filters} setFilters={setFilters} 
        channels={channels} creators={creators} isManager={isManager} 
        onAddTask={() => setAddTaskOpen(true)} 
      />

      {/* 4. ОСНОВНОЙ КОНТЕНТ */}
      <div className={`w-full transition-all duration-300 ${isRefreshing ? 'opacity-40 grayscale-[0.5] pointer-events-none' : 'opacity-100'}`}>
        
        {tasks.length === 0 && !isRefreshing ? (
          /* ЗАГЛУШКА */
          <div className="flex flex-col items-center justify-center py-32 px-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-slate-50 dark:bg-[#161616] rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Layers size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold dark:text-white">Список пуст</h3>
            <p className="text-sm text-slate-500 mt-2">Задач не найдено</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="hidden min-[850px]:block">
              <DesktopTable 
                tasks={tasks} user={user} isManager={isManager} isAdmin={isAdmin}
                highlightedId={highlightedId} activeDropdownId={activeDropdownId}
                setActiveDropdownId={setActiveDropdownId} loadData={loadData}
                setUploadTarget={setUploadTarget} setEditTarget={setEditTarget}
                setPublishTarget={setPublishTarget} setActivePreview={setActivePreview}
                handleDownload={handleDownload} lastElementRef={lastElementRef}
                setHistoryTarget={setHistoryTarget}
              />
            </div>
            <div className="block min-[850px]:hidden">
              <MobileList 
                tasks={tasks} user={user} isManager={isManager} highlightedId={highlightedId}
                setUploadTarget={setUploadTarget} setEditTarget={setEditTarget}
                setPublishTarget={setPublishTarget} setBottomSheetTask={setBottomSheetTask}
                setActivePreview={setActivePreview} lastElementRef={lastElementRef}
                handleDownload={handleDownload}
              />
            </div>
          </div>
        )}

        {isFetchingMore && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
      </div>

      <AnimatePresence>
        {bottomSheetTask && (
          <BottomSheet 
            task={bottomSheetTask} isManager={isManager} onClose={() => setBottomSheetTask(null)}
            setActivePreview={setActivePreview} setEditTarget={setEditTarget}
            loadData={loadData} handleDownload={handleDownload} setHistoryTarget={setHistoryTarget}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDownloading && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white"
          >
            <div className="bg-[#282828] p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl border border-white/10">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <div className="text-center">
                <p className="font-bold uppercase tracking-widest text-xs">Подготовка файла</p>
                <p className="text-[10px] text-white/40 mt-1 uppercase">Это может занять несколько секунд...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКИ */}
      {addTaskOpen && <AddTaskModal onClose={() => setAddTaskOpen(false)} onSuccess={() => { setAddTaskOpen(false); loadData(0, true); }} channels={channels} />}
      {editTarget && <EditTaskModal task={editTarget} creators={creators} onClose={() => setEditTarget(null)} onSuccess={() => { setEditTarget(null); loadData(0, true); }} />}
      {publishTarget && <PublishModal task={publishTarget} onClose={() => setPublishTarget(null)} onSuccess={() => { setPublishTarget(null); loadData(0, true); }} />}
      {activePreview && <VideoModal {...activePreview} onClose={() => setActivePreview(null)} />}
      {uploadTarget && <UploadModal task={uploadTarget} onClose={() => setUploadTarget(null)} onSuccess={() => { setUploadTarget(null); loadData(0, true); }} />}
      {historyTarget && <TaskHistoryModal task={historyTarget} onClose={() => setHistoryTarget(null)} />}
    </div>
  );
}