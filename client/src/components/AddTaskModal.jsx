import { useState, useEffect } from 'react';
import axios, { socket } from '../api';
import { 
  X, Sparkles, Clock, AlertCircle, CheckCircle2, 
  Loader2, LayoutGrid, Play, Zap, Globe, User, Calendar, Copy
} from 'lucide-react';
import VideoModal from './VideoModal';

export default function AddTaskModal({ onClose, onSuccess, channels }) {
  // Базовые состояния
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [useProxy, setUseProxy] = useState(false);
  const [creators, setCreators] = useState([]);
  const [localPreview, setLocalPreview] = useState(null);

  // Состояния для индивидуальных настроек каналов
  // Структура: { [channelId]: { creatorId, scheduledAt, deadline } }
  const [taskConfigs, setTaskConfigs] = useState({});

  // 1. Инициализация: загрузка списка креаторов
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const res = await axios.get('/api/tasks/creators');
        setCreators(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Ошибка загрузки креаторов:", err);
      }
    };
    fetchCreators();

    // Блокировка скролла страницы при открытой модалке
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // 2. Слушатель прогресса скачивания через сокеты
  useEffect(() => {
    socket.on('downloadProgress', (data) => {
      if (videoInfo && data.videoId === videoInfo.videoId) {
        if (data.status === 'DOWNLOADING') {
          setDownloadProgress(data.progress);
        }
        if (data.status === 'READY' || data.status === 'ERROR') {
          // Если видео скачалось или упало, обновляем статус в окне
          refreshStatus();
        }
      }
    });
    return () => socket.off('downloadProgress');
  }, [videoInfo?.videoId]);

  // Функция для "тихого" обновления статуса видео без сброса всей формы
  const refreshStatus = async () => {
    try {
      const res = await axios.post('/api/tasks/fetch-info', { url, useProxy });
      setVideoInfo(res.data);
    } catch (err) {
      console.error("Ошибка обновления статуса:", err);
    }
  };

  // 3. Проверка ссылки (первичная или принудительная)
  const handleCheckVideo = async () => {
    if (!url.trim()) return;
    setIsChecking(true);
    setVideoInfo(null);
    setDownloadProgress(0);
    setTaskConfigs({}); // Сбрасываем выбранные каналы при смене ссылки

    try {
      const isRetry = videoInfo && videoInfo.status === 'ERROR';
      const res = await axios.post('/api/tasks/fetch-info', { 
        url, 
        force: isRetry, 
        useProxy 
      });
      setVideoInfo(res.data);
    } catch (err) {
      setVideoInfo({ 
        status: 'ERROR', 
        errorMessage: err.response?.data?.error || "Ошибка связи с сервером. Проверьте прокси." 
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Помощник для форматирования даты под input datetime-local
  const formatToDateTimeLocal = (date) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  // 4. Управление выбором каналов
  const toggleChannel = (channelId) => {
    setTaskConfigs(prev => {
      const newConfigs = { ...prev };
      if (newConfigs[channelId]) {
        delete newConfigs[channelId];
      } else {
        newConfigs[channelId] = {
          creatorId: '',
          scheduledAt: '',
          deadline: ''
        };
      }
      return newConfigs;
    });
  };

  // Функция "Применить настройки первого канала ко всем остальным"
  const applyFirstToAll = () => {
    const ids = Object.keys(taskConfigs);
    if (ids.length < 2) return;

    const firstId = ids[0];
    const baseConfig = taskConfigs[firstId];
    
    const updatedConfigs = {};
    ids.forEach(id => {
      updatedConfigs[id] = { ...baseConfig };
    });
    setTaskConfigs(updatedConfigs);
  };

  // Обновление конкретного поля в настройках канала
  const updateConfigField = (channelId, field, value) => {
    setTaskConfigs(prev => {
      const newConfig = { ...prev[channelId], [field]: value };
      
      // Автоматика: если меняем время публикации, ставим дедлайн на час раньше
      if (field === 'scheduledAt' && value) {
        const pubDate = new Date(value);
        pubDate.setHours(pubDate.getHours() - 1);
        newConfig.deadline = formatToDateTimeLocal(pubDate);
      }

      return { ...prev, [channelId]: newConfig };
    });
  };

  // 5. Финальная отправка данных
  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedIds = Object.keys(taskConfigs);
    
    if (!videoInfo || videoInfo.status !== 'READY') return;
    if (selectedIds.length === 0) return alert("Выберите хотя бы один канал!");

    setIsSubmitting(true);
    try {
      // Преобразуем объект конфигов в массив для сервера
      const tasksArray = selectedIds.map(id => ({
        channelId: parseInt(id),
        creatorId: taskConfigs[id].creatorId ? parseInt(taskConfigs[id].creatorId) : null,
        deadline: taskConfigs[id].deadline || null,
        scheduledAt: taskConfigs[id].scheduledAt || null
      }));

      const res = await axios.post('/api/tasks/bulk', {
        originalVideoId: videoInfo.id,
        tasks: tasksArray
      });

      if (res.data.tgWarning) {
        alert(`⚠️ ${res.data.tgWarning}`);
      }

      onSuccess(); // Обновляем страницу менеджера и закрываем модалку
    } catch (err) {
      console.error(err);
      alert("Ошибка при сохранении задач в базу");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isChecking || videoInfo?.status === 'DOWNLOADING';
  const selectedCount = Object.keys(taskConfigs).length;

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-0 md:p-4 overflow-hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" 
        onClick={!isSubmitting ? onClose : undefined} 
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-3xl h-full md:h-auto md:max-h-[92vh] md:rounded-[2.5rem] shadow-2xl border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b dark:border-slate-800 bg-white dark:bg-[#0f172a] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap size={20} className="text-white" fill="currentColor" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Новая задача</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8 no-scrollbar">
          
          {/* URL INPUT SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Globe size={14} /> Ссылка на ролик
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" checked={useProxy} onChange={() => setUseProxy(!useProxy)} />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                  <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-all"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Proxy Mode</span>
              </label>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium outline-none focus:border-blue-500 transition-all shadow-inner"
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  placeholder="https://www.youtube.com/shorts/..."
                  disabled={isBusy}
                />
                {url && !isBusy && (
                  <button onClick={() => { setUrl(''); setVideoInfo(null); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              <button 
                onClick={() => handleCheckVideo()} 
                disabled={isBusy || !url}
                className="h-14 sm:h-auto px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 shrink-0"
              >
                {isChecking ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {isChecking ? 'Проверка...' : 'Проверить'}
              </button>
            </div>
          </div>

          {/* RESULTS / DOWNLOADING / READY */}
          {videoInfo && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
              
              {/* STATUS: DOWNLOADING */}
              {videoInfo.status === 'DOWNLOADING' && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 text-center space-y-4 shadow-sm">
                  <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Обработка на сервере: {downloadProgress.toFixed(0)}%</p>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.4)]" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* STATUS: ERROR / TOO LONG */}
              {(videoInfo.status === 'ERROR' || videoInfo.status === 'TOO_LONG') && (
                <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800 text-center space-y-3">
                  <AlertCircle className="text-red-500 mx-auto" size={32} />
                  <p className="text-sm font-bold text-red-600 uppercase tracking-tight">
                    {videoInfo.status === 'TOO_LONG' ? 'Видео слишком длинное' : 'Ошибка скачивания'}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">{videoInfo.errorMessage}</p>
                  <button onClick={() => { setUrl(''); setVideoInfo(null); }} className="text-[10px] font-bold text-blue-600 uppercase underline mt-2">Попробовать другую ссылку</button>
                </div>
              )}

              {/* STATUS: READY (The main configuration area) */}
              {videoInfo.status === 'READY' && (
                <div className="space-y-8 animate-in fade-in">
                  
                  {/* CLICKABLE VIDEO PREVIEW */}
                  <div 
                    onClick={() => setLocalPreview({ url: `/${videoInfo.filePath}`, title: videoInfo.title })}
                    className="bg-slate-50 dark:bg-[#1a1f2e] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-4 items-center cursor-pointer group hover:border-blue-500/30 transition-all shadow-sm"
                  >
                    <div className="w-32 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
                      <img src={`/${videoInfo.thumbnailPath}`} className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" alt="" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30"><Play fill="white" size={12} /></div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase leading-tight line-clamp-2">{videoInfo.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ready • {videoInfo.videoId}</p>
                    </div>
                  </div>

                  {/* CHANNEL SELECTION */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest px-1 flex items-center gap-2">
                      Шаг 1: Выберите каналы
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {channels.map(ch => {
                        const isSelected = taskConfigs[ch.id];
                        const isDup = videoInfo.existingChannelIds?.includes(ch.id);
                        return (
                          <button 
                            key={ch.id} 
                            onClick={() => toggleChannel(ch.id)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all relative
                              ${isSelected 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                : isDup 
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 text-amber-600' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}
                            `}
                          >
                            {ch.name}
                            {isDup && !isSelected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white dark:border-[#0f172a]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* INDIVIDUAL TASK SETTINGS */}
                  {selectedCount > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Шаг 2: Настройка задач</label>
                        {selectedCount > 1 && (
                          <button 
                            onClick={applyFirstToAll}
                            className="text-[10px] font-bold text-blue-500 flex items-center gap-1 hover:underline active:opacity-50"
                          >
                            <Copy size={12} /> Применить настройки первого ко всем
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {Object.keys(taskConfigs).map((id, index) => {
                          const ch = channels.find(c => c.id === parseInt(id));
                          const config = taskConfigs[id];
                          return (
                            <div 
                              key={id} 
                              className="bg-slate-50 dark:bg-[#1a1f2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm animate-in slide-in-from-right-4"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center justify-between border-b dark:border-slate-700 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-blue-600 text-white rounded-md flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{ch?.name}</span>
                                </div>
                                <button onClick={() => toggleChannel(id)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Creator Select */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Исполнитель</label>
                                  <select 
                                    value={config.creatorId} 
                                    onChange={(e) => updateConfigField(id, 'creatorId', e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-800 text-xs font-semibold outline-none focus:border-blue-500 transition-all cursor-pointer"
                                  >
                                    <option value="">В общую ленту</option>
                                    {creators.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                                  </select>
                                </div>
                                
                                {/* Scheduled Date */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Публикация</label>
                                  <input 
                                    type="datetime-local" 
                                    value={config.scheduledAt} 
                                    onChange={(e) => updateConfigField(id, 'scheduledAt', e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-800 text-[10px] font-medium outline-none focus:border-blue-500 text-slate-500"
                                  />
                                </div>

                                {/* Deadline Date */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Дедлайн (-1ч)</label>
                                  <input 
                                    type="datetime-local" 
                                    value={config.deadline} 
                                    onChange={(e) => updateConfigField(id, 'deadline', e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-800 text-[10px] font-medium outline-none focus:border-blue-500 text-slate-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 md:p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-black/20 mt-auto">
          <button 
            onClick={handleSubmit}
            disabled={selectedCount === 0 || isSubmitting || !videoInfo || videoInfo.status !== 'READY'}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:opacity-20 disabled:grayscale text-white rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
            <span>{isSubmitting ? 'Создание очереди...' : `Поставить в работу (${selectedCount})`}</span>
          </button>
        </div>
      </div>

      {/* Internal Video Preview Modal */}
      {localPreview && (
        <VideoModal 
          url={localPreview.url} 
          title={localPreview.title} 
          channel="Предпросмотр" 
          onClose={() => setLocalPreview(null)} 
        />
      )}
    </div>
  );
}