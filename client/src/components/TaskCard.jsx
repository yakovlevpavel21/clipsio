// client/src/components/TaskCard.jsx
import { Download, Play, Clock, UserCheck, Undo2, FileVideo, Eye, ExternalLink, PlayCircle, RotateCcw } from 'lucide-react';

export default function TaskCard({ task, mode, onClaim, onAbandon, onUpload, onPreview, onCancelUpload }) {
  const thumbUrl = `http://localhost:5000/${task.originalVideo?.thumbnailPath}`;
  const isHistory = mode === 'history';
  const isMy = mode === 'my';
  const isAvailable = mode === 'available';

  // Видео находится на проверке (в истории, но еще не опубликовано)
  const isPending = isHistory && task.status === 'REACTION_UPLOADED';

  // Форматирование даты: 15:45, 26 мар.
  const updatedAt = new Date(task.updatedAt);
  const formattedTime = updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = updatedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');

  return (
    <div className={`bg-white dark:bg-[#0f172a] rounded-2xl border p-3 flex flex-col md:flex-row gap-5 transition-all
      ${isHistory ? 'border-slate-100 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800 shadow-sm'}
    `}>

      {/* ПРЕВЬЮ */}
      <div className="relative w-full md:w-44 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border dark:border-white/5">
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-125" />
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-contain z-10" alt="thumb" />
        <div
          onClick={() => onPreview(task, (isHistory || task.status === 'REACTION_UPLOADED') ? 'reaction' : 'original')}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
            <Play fill="white" size={12} className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* ИНФОРМАЦИЯ */}
      <div className="flex-1 flex flex-col justify-center gap-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              {task.channel?.name}
            </span>

            {isHistory && (
              <span className={`font-bold px-2 py-0.5 rounded border ${task.status === 'PUBLISHED'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-800'
                }`}>
                {task.status === 'PUBLISHED' ? 'Опубликовано' : 'На проверке'}
              </span>
            )}

            <div className="flex items-center gap-1 text-slate-400 font-medium ml-1">
              <Clock size={10} /> {Math.floor(task.originalVideo?.duration / 60)}:{(task.originalVideo?.duration % 60).toString().padStart(2, '0')}
            </div>
          </div>

          {/* ДАТА ОБНОВЛЕНИЯ */}
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
              {formattedTime}, <span className="uppercase">{formattedDate}</span>
            </p>
          </div>
        </div>

        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-1">
          {task.originalVideo?.title}
        </h3>

        {task.needsFixing && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
            <p className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 mb-1">
              <RotateCcw size={10} /> Нужно исправить:
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight italic">
              "{task.rejectionReason || 'Без указания причины'}"
            </p>
          </div>
        )}

        {/* КНОПКИ УПРАВЛЕНИЯ */}
        <div className="flex items-center gap-2 mt-1">

          {isAvailable && (
            <button onClick={onClaim} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[11px] font-semibold transition-all">
              Взять в работу
            </button>
          )}

          {isMy && (
            <>
              <button onClick={onUpload} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[11px] font-semibold transition-all">
                {task.needsFixing ? "Заменить реакцию" : "Загрузить реакцию"}
              </button>

              {task.needsFixing && (
                <button 
                  onClick={() => onPreview(task, 'reaction')}
                  className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors"
                  title="Посмотреть текущую реакцию"
                >
                  <FileVideo size={16} />
                </button>
              )}

              <a href={`http://localhost:5000/${task.originalVideo.filePath}`} download className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-lg border dark:border-slate-700 transition-colors">
                <Download size={16} />
              </a>
              <button onClick={onAbandon} className="text-slate-400 hover:text-red-500 transition-colors ml-1" title="Отказаться">
                <Undo2 size={16} />
              </button>
            </>
          )}

          {isHistory && (
            <div className="flex items-center gap-2 w-full">
              <button onClick={() => onPreview(task, 'reaction')} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-colors">
                <FileVideo size={14} /> Реакция
              </button>
              <button onClick={() => onPreview(task, 'original')} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-colors">
                <Eye size={14} /> Оригинал
              </button>
              {task.status === 'PUBLISHED' && task.youtubeUrl && (
                <button onClick={() => window.open(task.youtubeUrl, '_blank', 'noopener,noreferrer')} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-colors">
                  <ExternalLink size={14}/> YouTube
                </button>
              )}

              {isPending && (
                <button
                  onClick={() => onCancelUpload(task.id)}
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-600 font-bold text-[10px] uppercase tracking-tighter ml-auto px-2"
                >
                  <RotateCcw size={14} /> Отозвать
                </button>
              )}

              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}