// client/src/components/TaskCardUploader.jsx
import { Play, Clock, Calendar, User } from 'lucide-react';

export default function TaskCardUploader({ task, onReview }) {
  const thumbUrl = `http://localhost:5000/${task.originalVideo?.thumbnailPath}`;
  
  // Форматирование даты обновления (когда креатор загрузил видео)
  const dateObj = new Date(task.updatedAt);
  const timeStr = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col md:flex-row gap-5 hover:border-blue-500/40 transition-all group shadow-sm">
      
      {/* ПРЕВЬЮ (16:9) */}
      <div className="relative w-full md:w-52 aspect-video rounded-xl overflow-hidden bg-black shrink-0 shadow-lg border border-white/5">
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125" />
        <img src={thumbUrl} className="absolute inset-0 w-full h-full object-contain z-10" alt="thumb" />
        
        {/* Кнопка быстрого открытия */}
        <div 
          onClick={onReview}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30">
            <Play fill="white" size={16} className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* ИНФОРМАЦИЯ */}
      <div className="flex-1 flex flex-col justify-center gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-100 dark:border-red-800">
                  {task.channel?.name}
                </span>

                {/* НОВОЕ: Имя креатора */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">
                  <User size={12} />
                  {task.creator?.username || 'Система'}
                </div>
                
                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                  <Clock size={12} /> {Math.floor(task.originalVideo?.duration / 60)}:{(task.originalVideo?.duration % 60).toString().padStart(2, '0')}
                </div>
             </div>
             
             {/* ВРЕМЯ ГОТОВНОСТИ */}
             <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
               Готов: {timeStr}, {dateStr}
             </div>
          </div>
          
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 uppercase tracking-tight pr-4">
            {task.originalVideo?.title}
          </h3>
        </div>

        {/* КНОПКА ПРОВЕРКИ */}
        <div className="flex items-center gap-2 mt-1">
          <button 
            onClick={onReview} 
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all shadow-md active:scale-95"
          >
            Проверить и выложить
          </button>
          
          {task.priority === 'urgent' && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-widest ml-2 animate-pulse">
              🔥 Срочно
            </span>
          )}
        </div>
      </div>

    </div>
  );
}