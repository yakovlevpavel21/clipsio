import { memo, useState } from 'react';
import { 
  Download, Play, Clock, Undo2, FileVideo, 
  AlertCircle, PlayCircle, Copy, Share, X, Info, Loader2, CheckCircle2, ExternalLink 
} from 'lucide-react';
import { getDownloadUrl } from '../api';

const TaskCard = ({ task, mode, onClaim, onAbandon, onUpload, onPreview, onCancelUpload }) => {
  // Состояния для iOS загрузки
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [prepStatus, setPrepStatus] = useState('idle'); // idle, loading, ready
  const [fileBlob, setFileBlob] = useState(null);
  
  const thumbUrl = `/${task.originalVideo?.thumbnailPath}`;
  const isHistory = mode === 'history';
  const isMy = mode === 'my';
  const isAvailable = mode === 'available';
  const isPending = task.status === 'COMPLETED' || task.status === 'READY_TO_PUBLISH';

  // Форматирование времени видео
  const formatDuration = (s) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs.toString().padStart(2, '0')}`;
  };

  // Форматирование дедлайна
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

  // Основной хендлер кнопки скачать
  const handleDownloadClick = (e) => {
    e.stopPropagation();
    const isIOSPWA = window.navigator.standalone; // Проверка на режим ярлыка

    if (isIOSPWA) {
      setShowIOSModal(true);
    } else {
      const fileName = `${task.originalVideo?.title || 'video'}.mp4`;
      window.location.href = getDownloadUrl(task.originalVideo?.filePath, fileName);
    }
  };

  // ЛОГИКА ДЛЯ iOS: СКАЧАТЬ В ПАМЯТЬ -> СОХРАНИТЬ В ФАЙЛЫ
  const prepareAndShare = async (e) => {
    e.stopPropagation();

    // ЭТАП 2: Файл уже в памяти, вызываем системное меню
    if (prepStatus === 'ready' && fileBlob) {
      try {
        const fileName = `${task.originalVideo?.title || 'video'}.mp4`;
        const file = new File([fileBlob], fileName, { type: 'video/mp4' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          setShowIOSModal(false);
          setPrepStatus('idle');
          setFileBlob(null);
        } else {
          alert("Ваше устройство не поддерживает Share API для этого файла");
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
           alert("Ошибка Share: " + err.message);
        }
      }
      return;
    }

    // ЭТАП 1: Загрузка файла в Blob
    setPrepStatus('loading');
    try {
      const fileName = `${task.originalVideo?.title || 'video'}.mp4`;
      const url = window.location.origin + getDownloadUrl(task.originalVideo?.filePath, fileName);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Сервер вернул ошибку " + response.status);
      
      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Файл пустой");

      setFileBlob(blob);
      setPrepStatus('ready');
    } catch (err) {
      alert("Ошибка подготовки: " + err.message);
      setPrepStatus('idle');
    }
  };

  const copyToClipboard = (e) => {
    e.stopPropagation();
    const fileName = `${task.originalVideo?.title || 'video'}.mp4`;
    const url = getDownloadUrl(task.originalVideo?.filePath, fileName);

    // Создаем временный элемент для копирования
    const textArea = document.createElement("textarea");
    textArea.value = url;
    // Делаем его невидимым
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert("Ссылка скопирована! Вставьте её в Safari.");
      } else {
        alert("Не удалось скопировать. Попробуйте еще раз.");
      }
    } catch (err) {
      alert("Ошибка копирования: " + err);
    }

    document.body.removeChild(textArea);
    setShowIOSModal(false);
  };

  const openInSafari = (e) => {
    e.stopPropagation();
    const fileName = `${task.originalVideo?.title || 'video'}.mp4`;
    const url = getDownloadUrl(task.originalVideo?.filePath, fileName);
    
    // В PWA это заставит систему открыть внутренний браузер, 
    // где будет кнопка "Открыть в Safari"
    window.location.href = url;
  };

  const getBorderStyle = () => {
    if (task.needsFixing) return 'border-red-500/40 bg-red-50/5 dark:bg-red-900/5 shadow-red-500/5';
    if (isMy) return 'border-blue-500/40 bg-blue-50/5 dark:bg-blue-900/5';
    return 'border-slate-200 dark:border-slate-800';
  };

  return (
    <>
      <div className={`bg-white dark:bg-[#0f172a] rounded-2xl border p-3 flex flex-col md:flex-row gap-4 transition-all hover:shadow-md ${getBorderStyle()}`}>
        
        {/* ПРЕВЬЮ */}
        <div className="relative w-full md:w-48 aspect-video rounded-xl overflow-hidden bg-black shrink-0 shadow-sm group/img border dark:border-white/5">
          <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
          <img src={thumbUrl} className="absolute inset-0 w-full h-full object-contain z-10" />
          
          <div className="absolute bottom-2 right-2 z-20 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white tabular-nums border border-white/10">
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
               <span className="text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                 {task.channel?.name || 'Без канала'}
               </span>

               {deadline && !isHistory && (
                 <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${deadline.isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}>
                   <Clock size={12} />
                   <span className="tabular-nums uppercase">{deadline.text}</span>
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

          {/* ПРИЧИНА ОТКЛОНЕНИЯ */}
          {task.needsFixing && (
            <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50 flex gap-2 items-start">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase leading-none mb-1">Нужны правки:</span>
                <p className="text-[11px] text-red-800 dark:text-red-300 italic leading-snug">
                  {task.rejectionReason || "Причина не указана"}
                </p>
              </div>
            </div>
          )}

          {/* КНОПКИ ДЕЙСТВИЙ */}
          <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
            {isAvailable && (
              <button 
                onClick={(e) => { e.stopPropagation(); onClaim(); }} 
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase active:scale-95 transition-all"
              >
                Взять в работу
              </button>
            )}

            {isMy && (
              <div className="flex items-center gap-2 w-full">
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpload(); }} 
                  className="flex-1 md:flex-none md:min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase active:scale-95 transition-all shadow-md"
                >
                  {task.needsFixing ? "Заменить файл" : "Загрузить ответ"}
                </button>
                
                <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                  <button 
                    onClick={handleDownloadClick}
                    title="Скачать оригинал"
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-blue-600 transition-colors border dark:border-slate-700 shadow-sm"
                  >
                    <Download size={18}/>
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onAbandon(); }} 
                    title="Отказаться от задачи"
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-red-500 transition-colors rounded-xl"
                  >
                    <Undo2 size={18}/>
                  </button>
                </div>
              </div>
            )}

            {isHistory && (
              <div className="flex items-center gap-2 w-full">
                <button onClick={(e) => { e.stopPropagation(); onPreview(task, 'reaction'); }} className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all border dark:border-slate-700">Мой ответ</button>
                <button onClick={(e) => { e.stopPropagation(); onPreview(task, 'original'); }} className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all border dark:border-slate-700">Оригинал</button>
                
                {isPending && (
                  <button onClick={(e) => { e.stopPropagation(); onCancelUpload(task.id); }} className="ml-auto text-red-500 font-bold text-[10px] uppercase px-3 py-2">Отозвать</button>
                )}
                
                {task.status === 'PUBLISHED' && task.youtubeUrl && (
                  <button onClick={(e) => { e.stopPropagation(); window.open(task.youtubeUrl, '_blank'); }} className="p-2.5 bg-red-500 text-white rounded-xl ml-auto active:scale-90 transition-all shadow-lg shadow-red-500/20"><PlayCircle size={18}/></button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* МОДАЛКА ДЛЯ iOS PWA (ЕДИНСТВЕННЫЙ СПОСОБ СКАЧАТЬ) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border dark:border-slate-800 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                <Info size={32} />
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Скачивание на iOS</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              В режиме ярлыка сохранение ограничено Apple. Подготовьте файл, а затем нажмите <b>"Сохранить видео"</b>.
            </p>

            <div className="space-y-3">
              {/* КНОПКА ПОДГОТОВИТЬ / СОХРАНИТЬ */}
              <button 
                onClick={prepareAndShare}
                disabled={prepStatus === 'loading'}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg ${
                  prepStatus === 'ready' 
                    ? 'bg-green-600 text-white shadow-green-500/20' 
                    : 'bg-blue-600 text-white shadow-blue-500/20'
                }`}
              >
                {prepStatus === 'loading' ? <Loader2 className="animate-spin" size={20} /> : prepStatus === 'ready' ? <CheckCircle2 size={20} /> : <Share size={20} />}
                {prepStatus === 'loading' ? 'Подготовка...' : prepStatus === 'ready' ? 'Сохранить видео' : 'Подготовить файл'}
              </button>

              <button 
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold active:scale-95 transition-all"
              >
                <Copy size={20} />
                Скопировать ссылку
              </button>
              
              <button 
                onClick={openInSafari}
                className="w-full flex items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800/50 text-slate-400 py-4 rounded-2xl font-bold text-[12px] uppercase tracking-wide"
              >
                <ExternalLink size={18} />
                Открыть в Safari
              </button>

              <button 
                onClick={() => { setShowIOSModal(false); setPrepStatus('idle'); setFileBlob(null); }}
                className="w-full py-2 text-slate-400 font-medium text-sm mt-2"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(TaskCard);