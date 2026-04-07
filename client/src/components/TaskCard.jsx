// client/src/components/TaskCard.jsx
import { 
  Download, Play, Clock, UserCheck, Undo2, 
  FileVideo, Eye, ExternalLink, RotateCcw, AlertCircle, 
} from 'lucide-react';

export default function TaskCard({ task, mode, onClaim, onAbandon, onUpload, onPreview, onCancelUpload }) {
  const thumbUrl = `/${task.originalVideo?.thumbnailPath}`;
  const isHistory = mode === 'history';
  const isMy = mode === 'my';
  const isAvailable = mode === 'available';

  // Состояния
  const isPending = isHistory && task.status === 'REACTION_UPLOADED';
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'PUBLISHED';
  
  // Форматирование даты: 15:45, 26 мар
  const updatedAt = new Date(task.updatedAt);
  const formattedTime = updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).replace('.', '');
  };
  
  const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Стили границ как у менеджера
  const getBorderStyle = () => {
    if (task.needsFixing || isOverdue) return 'border-red-500/40 bg-red-50/5 dark:bg-red-900/5';
    if (isMy) return 'border-blue-500/40 bg-blue-50/5 dark:bg-blue-900/5';
    return 'border-slate-200 dark:border-slate-800';
  };

  return (
    <div className={`bg-white dark:bg-[#0f172a] rounded-2xl border p-3 flex flex-col md:flex-row gap-5 transition-all group shadow-sm ${getBorderStyle()}`}>
      
      {/* ПРЕВЬЮ (16:9) */}
      <div className="relative w-full md:w-48 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border dark:border-white/5 shadow-md">
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30 scale-125" alt="" />
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-contain z-10" alt="thumb" />
        
        <div 
          onClick={() => onPreview(task, (isHistory || (isMy && task.reactionFilePath)) ? 'reaction' : 'original')}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
            <Play fill="white" size={14} className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* ИНФОРМАЦИЯ */}
      <div className="flex-1 flex flex-col justify-center gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
             <span className="text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-2 py-0.5 rounded">
               {task.channel?.name}
             </span>
             
             {/* Статус-баджи */}
             {isHistory && (
               <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                 task.status === 'PUBLISHED' 
                 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100' 
                 : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100'
               }`}>
                 {task.status === 'PUBLISHED' ? 'Опубликовано' : 'На проверке'}
               </span>
             )}

             {isOverdue && (
               <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                 <AlertCircle size={12} /> Просрочено
               </span>
             )}

             {task.needsFixing && isMy && (
               <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                 <AlertCircle size={12} /> Нужно исправить
               </span>
             )}
          </div>

          <div className="text-right shrink-0">
             <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
               {formattedTime}
             </p>
          </div>
        </div>
        
        <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 uppercase tracking-tight pr-4">
          {task.originalVideo?.title}
        </h3>

        {/* ПРИЧИНА ОТКЛОНЕНИЯ */}
        {task.needsFixing && isMy && (
          <div className="p-2 bg-red-100/30 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/50">
            <p className="text-[11px] text-red-800 dark:text-red-200 font-medium italic">
              «{task.rejectionReason || "Без комментария"}»
            </p>
          </div>
        )}

        {/* НИЖНЯЯ ПАНЕЛЬ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-5">

            {/* ДЕДЛАЙН */}
            {task.deadline && task.status !== 'PUBLISHED' && (
              <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tabular-nums ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                <Clock size={13} />
                <span>до {formatDateTime(task.deadline)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAvailable && (
              <button onClick={onClaim} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[11px] font-semibold transition-all shadow-sm active:scale-95">
                Взять в работу
              </button>
            )}

            {isMy && (
              <>
                <button onClick={onUpload} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[11px] font-semibold transition-all shadow-md active:scale-95">
                  {task.needsFixing ? "Заменить реакцию" : "Загрузить реакцию"}
                </button>
                {task.needsFixing && (
                  <button onClick={() => onPreview(task, 'reaction')} className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors">
                    <FileVideo size={16} />
                  </button>
                )}
                <a href={`/${task.originalVideo.filePath}`} download className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-lg border dark:border-slate-700 transition-colors">
                  <Download size={16} />
                </a>
                <button onClick={onAbandon} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Отказаться">
                  <Undo2 size={16} />
                </button>
              </>
            )}

            {isHistory && (
              <div className="flex items-center gap-2">
                <button onClick={() => onPreview(task, 'reaction')} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-colors">
                  <FileVideo size={14} /> Мой ответ
                </button>
                <button onClick={() => onPreview(task, 'original')} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-colors">
                  <Eye size={14} /> Исходник
                </button>
                {isPending && (
                  <button onClick={() => onCancelUpload(task.id)} className="flex items-center gap-1.5 text-red-500 hover:text-red-600 font-bold text-[10px] uppercase tracking-tighter ml-2 px-1">
                    <RotateCcw size={14} /> Отозвать
                  </button>
                )}
                {task.status === 'PUBLISHED' && task.youtubeUrl && (
                  <button onClick={() => window.open(task.youtubeUrl, '_blank', 'noopener,noreferrer')} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg border border-red-100 dark:border-red-800 hover:bg-red-600 hover:text-white transition-all ml-2">
                    <ExternalLink size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}