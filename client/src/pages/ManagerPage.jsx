// client/src/pages/ManagerPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Link2, Sparkles, Clock, AlertCircle, CheckCircle2, 
  Loader2, LayoutGrid, Play, Zap, Globe, Film, Trash2, List 
} from 'lucide-react';
import VideoModal from '../components/VideoModal';

const socket = io('http://localhost:5000');

export default function ManagerPage() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null); 
  const [isChecking, setIsChecking] = useState(false); 
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [isUrgent, setIsUrgent] = useState(false); // Состояние для галочки
  const [status, setStatus] = useState('idle'); 
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [useProxy, setUseProxy] = useState(false);
  const [activePreview, setActivePreview] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/channels');
        setChannels(res.data);
      } catch (err) { console.error(err); }
    };
    fetchChannels();
    fetchPendingTasks();
  }, []);

  useEffect(() => {
    socket.on('downloadProgress', (data) => {
      if (videoInfo && data.videoId === videoInfo.videoId) {
        if (data.status === 'DOWNLOADING') setDownloadProgress(data.progress);
        if (data.status === 'READY' || data.status === 'ERROR') handleCheckVideo(); 
      }
    });
    return () => socket.off('downloadProgress');
  }, [videoInfo?.videoId]);

  const handleCheckVideo = async () => {
    if (!url.trim()) return;
    setIsChecking(true);
    const isRetry = videoInfo && videoInfo.status === 'ERROR';

    try {
      const response = await axios.post('http://localhost:5000/api/tasks/fetch-info', { 
        url, force: isRetry, useProxy 
      });
      setVideoInfo(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Ошибка при связи с сервером';
      setVideoInfo({ status: 'ERROR', errorMessage, url });
    } finally {
      setIsChecking(false);
    }
  };

  const fetchPendingTasks = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/tasks/available');
      setPendingTasks(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Удалить задачу из ленты креаторов?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/tasks/${id}`);
      fetchPendingTasks(); // Обновляем список
      // Также можно вызвать handleCheckVideo(), чтобы обновить кружочки на каналах
    } catch (err) { alert("Ошибка при удалении"); }
  };

  const handleSubmit = async () => {
    if (!videoInfo || videoInfo.status !== 'READY') return;
    if (selectedChannels.length === 0) return alert("Выберите хотя бы один канал!");

    const hasDuplicates = selectedChannels.some(id => videoInfo.existingChannelIds?.includes(id));
    
    if (hasDuplicates) {
      const confirmDouble = window.confirm("Это видео уже добавлялось на некоторые из выбранных каналов. Всё равно создать задачи?");
      if (!confirmDouble) return;
    }

    try {
      // ИСПРАВЛЕНО: передаем правильное значение приоритета
      await axios.post('http://localhost:5000/api/tasks', {
        originalVideoId: videoInfo.id,
        channelIds: selectedChannels,
        priority: isUrgent ? 'urgent' : 'normal' 
      });
      
      setStatus('success');
      fetchPendingTasks();
      setUrl('');
      setVideoInfo(null);
      setSelectedChannels([]);
      setIsUrgent(false);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) { 
      console.error(error);
      alert("Ошибка при создании задач"); 
    }
  };

  const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 font-['Inter']">
      
      <header className="pt-10 mb-8 animate-in fade-in duration-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={20} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Добавить видео</h1>
        </div>
        <p className="text-sm md:text-base text-slate-500 font-medium">Система подготовит Shorts для вашей команды.</p>
      </header>

      <div className="space-y-5">
        
        {/* INPUT CARD */}
        <div className="bg-white dark:bg-[#1a1f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={useProxy} onChange={() => setUseProxy(!useProxy)} />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-all"></div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Использовать Proxy</span>
            </label>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input 
              className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-500 transition-all"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Вставьте ссылку на YouTube..."
            />
            <button 
              onClick={handleCheckVideo}
              disabled={isChecking || !url}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isChecking ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Проверить видео
            </button>
          </div>
        </div>

        {/* RESULT AREA */}
        {videoInfo && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
            
            {/* DOWNLOADING */}
            {videoInfo.status === 'DOWNLOADING' && (
              <div className="bg-white dark:bg-[#1a1f2e] p-6 rounded-2xl border border-blue-500/20 text-center space-y-4">
                <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Загрузка на сервер</p>
                  <p className="text-xl font-bold text-blue-600 tabular-nums">{downloadProgress.toFixed(1)}%</p>
                </div>
                <div className="w-full max-w-xs mx-auto bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                </div>
              </div>
            )}

            {/* ERROR / TOO LONG */}
            {(videoInfo.status === 'ERROR' || videoInfo.status === 'TOO_LONG') && (
              <div className="bg-white dark:bg-[#1a1f2e] p-6 rounded-2xl border border-red-500/20 flex flex-col items-center text-center space-y-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${videoInfo.status === 'TOO_LONG' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                  <AlertCircle size={24} />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                   {videoInfo.status === 'TOO_LONG' ? 'Видео отклонено' : 'Ошибка обработки'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{videoInfo.errorMessage}</p>
                <button onClick={() => { setUrl(''); setVideoInfo(null); }} className="text-blue-500 font-bold text-[10px] uppercase underline tracking-widest">Сбросить</button>
              </div>
            )}

            {/* READY */}
            {videoInfo.status === 'READY' && (
              <div className="space-y-4">
                {/* Horizontal Card Preview */}
                <div className="bg-white dark:bg-[#1a1f2e] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
                  <div 
                    onClick={() => setActivePreview({ url: `http://localhost:5000/${videoInfo.filePath}`, title: videoInfo.title })}
                    className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-black shrink-0 cursor-pointer group"
                  >
                    <img src={`http://localhost:5000/${videoInfo.thumbnailPath}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="thumb" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                        <Play fill="white" size={16} />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left py-1 px-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                       <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border border-emerald-100 dark:border-emerald-800 px-1.5 py-0.5 rounded uppercase">Ready</span>
                       <span className="text-[10px] text-slate-400 font-medium tracking-wide flex items-center gap-1">
                         <Clock size={12} /> {formatDuration(videoInfo.duration)}
                       </span>
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2 break-words uppercase">
                      {videoInfo.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">ID: {videoInfo.videoId}</p>
                  </div>
                </div>

                {/* TASK SETUP */}
                <div className="bg-white dark:bg-[#1a1f2e] p-5 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm">
                  
                  {/* Channels Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid size={14}/> Назначить на каналы
                      </label>
                      <div className="flex gap-4">
                        <button onClick={() => setSelectedChannels(channels.map(c => c.id))} className="text-[10px] font-bold text-blue-500 uppercase hover:text-blue-600">Все</button>
                        <button onClick={() => setSelectedChannels([])} className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500">Сброс</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      {channels.map(ch => {
                        const isSelected = selectedChannels.includes(ch.id);
                        
                        // ПРОВЕРКА НА ДУБЛИКАТ
                        const isDuplicate = videoInfo.existingChannelIds?.includes(ch.id);

                        return (
                          <button 
                            key={ch.id} 
                            onClick={() => setSelectedChannels(prev => isSelected ? prev.filter(id => id !== ch.id) : [...prev, ch.id])}
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border relative
                              ${isSelected 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                : isDuplicate
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'}
                            `}
                          >
                            {ch.name}
                            {isDuplicate && !isSelected && (
                              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-[#1a1f2e]" title="Это видео уже есть на этом канале" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* ТЕКСТОВОЕ ПРЕДУПРЕЖДЕНИЕ */}
                    {selectedChannels.some(id => videoInfo.existingChannelIds?.includes(id)) && (
                      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl mt-4">
                        <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                          <span className="font-bold uppercase block mb-1">Внимание: Дубликат</span>
                          Вы выбрали каналы, на которые это видео уже добавлялось ранее. Убедитесь, что это не ошибка.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Priority Toggle & Submit */}
                  <div className="flex flex-col gap-4 border-t dark:border-slate-800 pt-8">
                    
                    <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                      <div className="flex items-center gap-3">
                         <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isUrgent ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600'}`}>
                           {isUrgent && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                         </div>
                         <div className="flex flex-col">
                            <span className={`text-[13px] font-bold uppercase tracking-tight ${isUrgent ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>Приоритет: Срочно 🔥</span>
                            <span className="text-[10px] text-slate-400 font-medium">Задача будет поднята в начало ленты</span>
                         </div>
                      </div>
                      <input type="checkbox" className="hidden" checked={isUrgent} onChange={() => setIsUrgent(!isUrgent)} />
                    </label>

                    <button 
                      onClick={handleSubmit}
                      disabled={selectedChannels.length === 0}
                      className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-20 transition-all shadow-xl"
                    >
                      Поставить в очередь ({selectedChannels.length})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS ALERT */}
        {status === 'success' && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 animate-in zoom-in-95">
            <CheckCircle2 size={24} />
            <span className="font-bold uppercase text-xs tracking-widest">Задачи успешно поставлены в работу</span>
          </div>
        )}
      </div>

      {activePreview && (
        <VideoModal 
          url={activePreview.url}
          title={activePreview.title}
          channel="Оригинал"
          onClose={() => setActivePreview(null)}
        />
      )}

      {/* --- НОВАЯ СЕКЦИЯ: ОЧЕРЕДЬ В ЛЕНТЕ --- */}
      <div className="mt-16 space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
               <List size={18} />
             </div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase">Задачи в ленте</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            {pendingTasks.length} свободных
          </span>
        </div>

        <div className="space-y-3">
          {pendingTasks.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-medium uppercase tracking-widest">
              Лента пуста
            </div>
          ) : (
            pendingTasks.map(task => (
              <div key={task.id} className="bg-white dark:bg-[#1a1f2e] p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 group">
                {/* Мини-превью */}
                <div className="w-16 aspect-video rounded-lg overflow-hidden bg-black shrink-0 shadow-sm border border-black/5">
                   <img src={`http://localhost:5000/${task.originalVideo?.thumbnailPath}`} className="w-full h-full object-cover" alt="" />
                </div>

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                      {task.channel?.name}
                    </span>
                    {task.priority === 'urgent' && <span className="text-[9px] font-bold text-red-500 uppercase">Срочно</span>}
                  </div>
                  <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate uppercase leading-tight">
                    {task.originalVideo?.title}
                  </h4>
                </div>

                {/* Кнопка отмены */}
                <button 
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  title="Удалить задачу"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}