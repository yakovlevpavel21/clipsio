import { useEffect } from 'react';
import { X, Clock, Plus, UploadCloud, CheckCircle2, Calendar, Target, AlertCircle, Check } from 'lucide-react';
import { VideoThumbnail } from './Helpers';

export default function TaskHistoryModal({ task, onClose }) {

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!task) return null;

  // Логика проверок
  const isLate = task.reactionUploadedAt && task.deadline && new Date(task.reactionUploadedAt) > new Date(task.deadline);
  const isLive = task.scheduledAt && new Date() >= new Date(task.scheduledAt);

  const phases = [
    {
      id: 'created',
      label: 'Задача создана',
      date: task.createdAt,
      icon: <Plus size={16} />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      description: 'Ролик добавлен в систему'
    },
    {
      id: 'uploaded',
      label: 'Реакция готова',
      date: task.reactionUploadedAt,
      icon: <UploadCloud size={16} />,
      color: isLate ? 'text-red-500' : 'text-emerald-500',
      bg: isLate ? 'bg-red-500/10' : 'bg-emerald-500/10',
      description: task.creator ? `Автор: ${task.creator.username}` : 'Файл загружен',
      badge: task.reactionUploadedAt ? (
        isLate
          ? <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded ml-2 uppercase">Просрочено</span>
          : <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded ml-2 uppercase">В срок</span>
      ) : null
    },
    {
      id: 'published',
      label: 'Загружено на YouTube',
      date: task.publishedAt,
      icon: <CheckCircle2 size={16} />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      description: 'Менеджер подтвердил публикацию',
      badge: isLive && task.publishedAt ? (
        <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded ml-2 uppercase flex items-center gap-1">
          <Check size={10} strokeWidth={4} /> В эфире
        </span>
      ) : null
    }
  ];

  const formatFullDate = (date) => {
    const d = new Date(date);
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    };
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-0 md:p-4 font-['Inter'] overflow-hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Фон изменен на dark:bg-[#1f1f1f] */}
      <div className="relative bg-white dark:bg-[#1f1f1f] w-full max-w-lg h-full md:h-auto md:max-h-[85vh] md:rounded-2xl shadow-2xl border border-slate-200 dark:border-[#333333] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#333333] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/10 text-blue-600 rounded-lg flex items-center justify-center">
              <Clock size={18} />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">История активности</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#333333] rounded-full transition-all text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar space-y-10">
          
          {/* КОНТЕКСТ */}
          <div className="flex gap-4 p-3 bg-slate-50 dark:bg-[#222222] rounded-xl border border-slate-100 dark:border-[#333333]">
            <VideoThumbnail
              src={task.originalVideo?.thumbnailPath}
              duration={task.originalVideo?.duration}
              className="w-20 h-12 rounded-lg shadow-sm"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter mb-0.5">{task.channel?.name}</p>
              <h4 className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                {task.originalVideo?.title}
              </h4>
            </div>
          </div>

          {/* ЦЕЛИ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-[#161616] rounded-xl border border-slate-100 dark:border-[#333333]">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Target size={11} />
                <span className="text-[9px] font-black uppercase tracking-widest">Дедлайн</span>
              </div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '---'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#161616] rounded-xl border border-slate-100 dark:border-[#333333]">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <Calendar size={11} />
                <span className="text-[9px] font-black uppercase tracking-widest">Публикация</span>
              </div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                {task.scheduledAt ? new Date(task.scheduledAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '---'}
              </p>
            </div>
          </div>

          {/* ТАЙМЛАЙН С ОТРЕЗКАМИ */}
          <div className="flex flex-col">
            {phases.map((phase, i) => {
              const isDone = !!phase.date;
              const isLast = i === phases.length - 1;
              const dateInfo = isDone ? formatFullDate(phase.date) : null;

              return (
                <div key={phase.id} className="flex gap-5 group">
                  
                  {/* КОЛОНКА ИКОНКИ И ЛИНИИ */}
                  <div className="flex flex-col items-center">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isDone 
                        ? phase.bg + ' ' + phase.color 
                        : 'bg-slate-50 dark:bg-[#262626] text-slate-300 opacity-30'
                    }`}>
                      {phase.icon}
                    </div>
                    
                    {/* Отрезок линии под иконкой (кроме последнего пункта) */}
                    {!isLast && (
                      <div className={`w-px h-10 my-2 transition-colors ${
                        isDone ? 'bg-slate-200 dark:bg-[#333333]' : 'bg-slate-100 dark:bg-[#262626]'
                      }`} />
                    )}
                  </div>

                  {/* КОНТЕНТ СОБЫТИЯ */}
                  <div className={`flex-1 flex justify-between items-start pt-1 min-w-0 ${!isDone ? 'opacity-30 grayscale' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[14px] font-bold text-slate-900 dark:text-white truncate">
                          {phase.label}
                        </h4>
                        {phase.badge}
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                        {isDone ? phase.description : 'Ожидание...'}
                      </p>
                    </div>

                    {/* Дата и время справа */}
                    {isDone && (
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white tabular-nums leading-none mb-1">
                          {dateInfo.time}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-70">
                          {dateInfo.date}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-[#333333] bg-slate-50/50 dark:bg-black/20 text-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">System Log Analytics</span>
        </div>
      </div>
    </div>
  );
}