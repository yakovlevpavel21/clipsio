import { memo, useState } from 'react';
import { 
  Download, Play, Clock, Undo2, FileVideo, 
  AlertCircle, PlayCircle, Loader2 
} from 'lucide-react';
import { getDownloadUrl } from '../api';

const TaskCard = ({ task, mode, onClaim, onAbandon, onUpload, onPreview, onCancelUpload }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const thumbUrl = `/${task.originalVideo?.thumbnailPath}`;
  const isHistory = mode === 'history';
  const isMy = mode === 'my';
  const isAvailable = mode === 'available';
  const isPending = task.status === 'COMPLETED' || task.status === 'READY_TO_PUBLISH';

  // ХЕНДЛЕР СКАЧИВАНИЯ
  const handleDownload = async (e) => {
    e.stopPropagation();
    if (isDownloading) return;

    const videoFileName = `${task.originalVideo?.videoId || 'video'}.mp4`;
    const url = window.location.origin + getDownloadUrl(task.originalVideo?.filePath, videoFileName);

    // ОПРЕДЕЛЯЕМ ОКРУЖЕНИЕ
    // 1. Запущено ли как ярлык (Standalone)
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    // 2. Является ли устройство мобильным
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Используем Share API ТОЛЬКО в мобильном PWA (где обычное скачивание заблокировано)
    if (isStandalone && isMobile && navigator.share) {
      setIsDownloading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const blob = await response.blob();
        const file = new File([blob], videoFileName, { type: 'video/mp4' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          // Сбрасываем лоадер ПЕРЕД открытием меню, чтобы кнопка не залипала
          setIsDownloading(false);
          await navigator.share({
            files: [file],
            title: videoFileName,
          });
        } else {
          throw new Error('Система не поддерживает передачу файлов');
        }
      } catch (err) {
        setIsDownloading(false);
        if (err.name !== 'AbortError') {
          // Если Share API не сработал, пробуем обычный метод в новом окне
          window.open(url, '_blank');
        }
      }
    } else {
      // НА ПК И В ОБЫЧНЫХ БРАУЗЕРАХ: Простое мгновенное скачивание
      const link = document.createElement('a');
      link.href = url;
      link.download = videoFileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDuration = (s) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDeadline = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const isOverdue = d < now;
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return { text: `${dateStr}, ${timeStr}`, isOverdue };
  };

  const deadline = formatDeadline(task.deadline);

  const getBorderStyle = () => {
    if (task.needsFixing) return 'border-red-500/40 bg-red-50/5 dark:bg-red-900/5';
    if (isMy) return 'border-blue-500/40 bg-blue-50/5 dark:bg-blue-900/5';
    return 'border-slate-200 dark:border-slate-800';
  };

  return (
    <div className={`bg-white dark:bg-[#0f172a] rounded-2xl border p-3 flex flex-col md:flex-row gap-4 transition-all hover:shadow-md ${getBorderStyle()}`}>
      
      {/* ПРЕВЬЮ */}
      <div className="relative w-full md:w-48 aspect-video rounded-xl overflow-hidden bg-black shrink-0 shadow-sm border dark:border-white/5">
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-contain z-10" />
        <div className="absolute bottom-2 right-2 z-20 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-white tabular-nums border border-white/10">
          {formatDuration(task.originalVideo?.duration)}
        </div>
        <div 
          onClick={(e) => { 
            e.stopPropagation(); 
            onPreview(task, (isHistory || (isMy && task.reactionFilePath)) ? 'reaction' : 'original'); 
          }}
          className="absolute inset-0 z-30 flex items-center justify-center cursor-pointer bg-black/20 md:opacity-0 group-hover/img:opacity-100 transition-opacity"
        >
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 hover:scale-110 transition-transform">
            <Play fill="white" size={16} className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* ИНФОРМАЦИЯ */}
      <div className="flex-1 flex flex-col min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap items-center gap-2">
             <span className="text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 tracking-wide">
               {task.channel?.name || 'Без канала'}
             </span>
             {deadline && !isHistory && (
               <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${deadline.isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}>
                 <Clock size={12} /> <span className="tabular-nums uppercase">{deadline.text}</span>
               </div>
             )}
          </div>
          <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">
            {new Date(task.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        <h3 className="text-[14px] md:text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate uppercase mb-2">
          {task.originalVideo?.title}
        </h3>

        {task.needsFixing && isMy && (
          <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50 flex gap-2 items-start">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-800 dark:text-red-300 italic leading-snug">{task.rejectionReason || "Нужны правки"}</p>
          </div>
        )}

        {/* КНОПКИ */}
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
          {isAvailable && (
            <button onClick={(e) => { e.stopPropagation(); onClaim(); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase active:scale-95 transition-all shadow-md shadow-blue-500/20">Взять в работу</button>
          )}

          {isMy && (
            <div className="flex items-center gap-2 w-full">
              <button onClick={(e) => { e.stopPropagation(); onUpload(); }} className="flex-1 md:flex-none md:min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase active:scale-95 transition-all">Загрузить ответ</button>
              <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                <button 
                  disabled={isDownloading}
                  onClick={handleDownload} 
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-center min-w-[42px] ${isDownloading ? 'bg-slate-50 text-blue-600 border-blue-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent dark:border-slate-700 shadow-sm'}`}
                >
                  {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18}/>}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAbandon(); }} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-red-500 transition-colors rounded-xl border dark:border-slate-800"><Undo2 size={18}/></button>
              </div>
            </div>
          )}

          {isHistory && (
            <div className="flex items-center gap-2 w-full">
              <button onClick={(e) => { e.stopPropagation(); onPreview(task, 'reaction'); }} className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase border dark:border-slate-700">Мой ответ</button>
              <button onClick={(e) => { e.stopPropagation(); onPreview(task, 'original'); }} className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase border dark:border-slate-700">Оригинал</button>
              <div className="flex items-center gap-1.5 ml-auto">
                <button disabled={isDownloading} onClick={handleDownload} className={`p-2 transition-colors ${isDownloading ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}>
                  {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18}/>}
                </button>
                {isPending && <button onClick={(e) => { e.stopPropagation(); onCancelUpload(task.id); }} className="text-red-500 font-bold text-[10px] uppercase px-2">Отозвать</button>}
                {task.status === 'PUBLISHED' && task.youtubeUrl && (
                  <button onClick={(e) => { e.stopPropagation(); window.open(task.youtubeUrl, '_blank'); }} className="p-2 bg-red-500 text-white rounded-xl active:scale-90 transition-all shadow-lg shadow-red-500/20"><PlayCircle size={18}/></button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(TaskCard);