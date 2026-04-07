// client/src/components/TaskCardManager.jsx
import { 
  Play, Clock, User, Trash2, Edit3, 
  Send, ExternalLink, AlertCircle, Calendar 
} from 'lucide-react';

export default function TaskCardManager({ task, onPreview, onPublish, onDelete, onEdit }) {
  const thumbUrl = `/${task.originalVideo?.thumbnailPath}`;
  
  // Проверка дедлайна
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'PUBLISHED';
  
  const createdAt = new Date(task.createdAt);
  const formattedTime = createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // Красивый формат даты: "15:45, 26 мар"
  const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).replace('.', '');
  };

  const statusConfig = {
    AWAITING_REACTION: { label: 'Ожидает', color: 'text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800' },
    IN_PROGRESS: { label: 'В работе', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' },
    REACTION_UPLOADED: { label: 'Готово', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
    PUBLISHED: { label: 'Выложено', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' },
  };

  const status = statusConfig[task.status] || statusConfig.AWAITING_REACTION;

  const getBorderStyle = () => {
    if (task.status === 'REACTION_UPLOADED') return 'border-blue-500/40 bg-blue-50/5 dark:bg-blue-900/5';
    if (isOverdue) return 'border-red-500/40 bg-red-50/5 dark:bg-red-900/5';
    return 'border-slate-200 dark:border-slate-800';
  };

  return (
    <div className={`bg-white dark:bg-[#0f172a] rounded-2xl border p-3 flex flex-col md:flex-row gap-5 transition-all group shadow-sm ${getBorderStyle()}`}>
      
      {/* ПРЕВЬЮ */}
      <div className="relative w-full md:w-48 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border dark:border-white/5 shadow-md">
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover blur-lg opacity-30 scale-125" alt="" />
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-contain z-10" alt="thumb" />
        
        <div 
          onClick={() => onPreview(task, (task.status === 'PUBLISHED' || task.status === 'REACTION_UPLOADED') ? 'reaction' : 'original')}
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
             <span className="text-[10px] font-bold uppercase bg-slate-50 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded border dark:border-slate-700">
               {task.channel?.name}
             </span>
             <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${status.color}`}>
               {status.label}
             </span>
             {isOverdue && (
               <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                 <AlertCircle size={12} /> Просрочено
               </span>
             )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
             {/* Кнопки управления (только если не опубликовано) */}
             {task.status !== 'PUBLISHED' && (
               <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
                 <button onClick={() => onEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="Редактировать">
                   <Edit3 size={15} />
                 </button>
                 <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Удалить">
                   <Trash2 size={15} />
                 </button>
               </div>
             )}

             {/* ВРЕМЯ СОЗДАНИЯ (ВСЕГДА В УГЛУ) */}
             <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
               {formattedTime}
             </p>
          </div>
        </div>
        
        <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 uppercase tracking-tight pr-4">
          {task.originalVideo?.title}
        </h3>

        {/* НИЖНЯЯ ПАНЕЛЬ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-5">
            {/* ИСПОЛНИТЕЛЬ */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <User size={13} className="text-slate-400" />
              {task.creator ? (
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{task.creator.username}</span>
              ) : (
                <span className="text-slate-400 italic text-[10px]">Свободно</span>
              )}
            </div>

            {/* СРОК ДЛЯ КРЕАТОРА */}
            {task.deadline && task.status !== 'PUBLISHED' && (
              <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tabular-nums ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                <Clock size={13} />
                <span>до {formatDateTime(task.deadline)}</span>
              </div>
            )}

            {/* ПЛАН ПУБЛИКАЦИИ */}
            {task.scheduledAt && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500/80 uppercase tabular-nums">
                <Calendar size={13} />
                <span>План: {formatDateTime(task.scheduledAt)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* КНОПКА ВЫЛОЖИТЬ */}
            {task.status === 'REACTION_UPLOADED' && (
              <button 
                onClick={onPublish}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Send size={14} /> Выложить
              </button>
            )}

            {/* ССЫЛКА НА ЮТУБ */}
            {task.status === 'PUBLISHED' && task.youtubeUrl && (
              <a 
                href={task.youtubeUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-red-500 hover:text-red-600 font-bold text-[10px] uppercase tracking-tighter"
              >
                <ExternalLink size={14} /> Открыть на YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}