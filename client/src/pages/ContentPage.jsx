import { useEffect, useState, useCallback, useRef } from 'react';
import api, { socket, getDownloadUrl } from '../api';
import { Loader2, Plus, Layers, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Компоненты
import FilterBar from '../components/content/FilterBar';
import DesktopTable from '../components/content/DesktopTable';
import MobileList from '../components/content/MobileList';
import BottomSheet from '../components/content/BottomSheet';
import TaskHistoryModal from '../components/content/TaskHistoryModal';

// Модалки
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

  const loadData = async (skip = 0, reset = false) => {
    if (reset && tasks.length === 0) setIsInitialLoading(true);
    else if (reset) setIsRefreshing(true);
    else setIsFetchingMore(true);

    try {
      const res = await api.get('/api/tasks/content', { params: { skip, take: 20, ...filters } });
      setTasks(prev => reset ? res.data : [...prev, ...res.data]);
      setHasMore(res.data.length === 20);
    } catch (e) { console.error(e); }
    finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
      setPullDistance(0);
    }
  };

  useEffect(() => { loadData(0, true); }, [filters]);
  
  useEffect(() => { 
    api.get('/api/channels').then(res => setChannels(res.data));
    if (isManager) api.get('/api/tasks/creators').then(res => setCreators(res.data));
  }, [isManager]);

  const location = useLocation();

  useEffect(() => {
    // 1. Берем ID задачи из стейта перехода
    const taskId = location.state?.scrollToTaskId;
    
    // 2. Если ID есть и список задач уже загружен
    if (taskId && tasks.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`task-${taskId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(taskId);
          
          // --- КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ---
          // Очищаем state в истории браузера. 
          // Теперь location.state.scrollToTaskId станет undefined.
          // При следующих обновлениях списка (через сокеты) этот эффект больше не сработает.
          navigate(location.pathname, { replace: true, state: {} });
          
          setTimeout(() => setHighlightedId(null), 3000);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [location.state?.scrollToTaskId, tasks.length > 0]);

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
    // Выбираем путь в зависимости от типа
    const path = type === 'original' ? task.originalVideo?.filePath : task.reactionFilePath;
    if (!path) return alert("Файл не найден");
    
    // Формируем имя файла для сохранения
    const suffix = type === 'original' ? 'original' : 'result';
    const videoFileName = `${task.originalVideo.videoId}_${suffix}.mp4`;
    
    const url = window.location.origin + getDownloadUrl(path, videoFileName);
    
    const isStandalone = window.navigator.standalone;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isStandalone && isIOS && navigator.share) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], videoFileName, { type: 'video/mp4' });
        await navigator.share({ files: [file] });
      } catch (err) {
        if (err.name !== 'AbortError') window.open(url, '_blank');
      }
    } else {
      const link = document.body.appendChild(document.createElement('a'));
      link.href = url;
      link.download = videoFileName;
      link.click();
      link.remove();
    }
  };

  useEffect(() => {
    const handleTaskUpdate = (updatedTask) => {
      const isRelevant = 
        isAdmin || 
        (user.role === 'MANAGER' && updatedTask.managerId === user.id) || 
        (user.role === 'CREATOR' && updatedTask.creatorId === user.id);

      if (!isRelevant) return;

      setTasks(prev => {
        const exists = prev.find(t => t.id === updatedTask.id);
        const updatedList = exists 
          ? prev.map(t => t.id === updatedTask.id ? updatedTask : t)
          : [updatedTask, ...prev];

        // Сортировка должна полностью повторять логику бэкенда
        return [...updatedList].sort((a, b) => {
          // Приоритет: запланированная дата, если нет - дата создания
          const timeA = new Date(a.scheduledAt || a.createdAt).getTime();
          const timeB = new Date(b.scheduledAt || b.createdAt).getTime();
          
          return timeB - timeA; // Сначала новые/будущие
        });
      });

      setHighlightedId(updatedTask.id);
      setTimeout(() => setHighlightedId(null), 3000);
    };

    socket.on('task_updated', handleTaskUpdate);
    return () => socket.off('task_updated');
  }, [user.id, isAdmin]);

  const lastElementRef = useCallback(node => {
    if (isFetchingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadData(tasks.length);
    });
    if (node) observer.current.observe(node);
  }, [isFetchingMore, hasMore, tasks.length]);

  if (isInitialLoading) return <div className="flex justify-center py-20 bg-white dark:bg-[#1f1f1f] min-h-screen text-blue-500"><Loader2 className="animate-spin" size={32} /></div>;

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
                tasks={tasks} isManager={isManager} highlightedId={highlightedId}
                setUploadTarget={setUploadTarget} setEditTarget={setEditTarget}
                setPublishTarget={setPublishTarget} setBottomSheetTask={setBottomSheetTask}
                setActivePreview={setActivePreview} lastElementRef={lastElementRef}
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