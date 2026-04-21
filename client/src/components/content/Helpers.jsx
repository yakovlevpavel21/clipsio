import { Clock, CheckCircle2, AlertCircle, Zap, List, Info, Film, ImageOff } from 'lucide-react';
import { useState } from 'react';

// Иконки (для мобилок и Dashboards)
export function StatusIcon({ task, size = 16 }) {
  if (task.status === 'PUBLISHED') return <CheckCircle2 size={size} className="text-emerald-500" />;
  if (task.needsFixing) return <AlertCircle size={size} className="text-red-500 animate-pulse" />;
  if (task.status === 'REACTION_UPLOADED') return <Clock size={size} className="text-blue-500" />;
  if (task.status === 'IN_PROGRESS') return <Zap size={size} className="text-amber-500" />;
  return <List size={size} className="text-slate-400" />;
}

// Профессиональные бейджи для ПК (с поддержкой троеточия)
export function StatusBadge({ task }) {
  const baseClass = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border max-w-full overflow-hidden whitespace-nowrap";

  const renderBadge = (config) => (
    <div className={`${baseClass} ${config.bg} ${config.text} ${config.border}`} title={config.label}>
      <config.icon size={12} className="shrink-0" />
      <span className="truncate">{config.label}</span>
    </div>
  );

  if (task.status === 'PUBLISHED') {
    return renderBadge({
      label: 'Опубликовано',
      icon: CheckCircle2,
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-500/20'
    });
  }

  if (task.needsFixing) {
    return (
      <div className="relative group/status inline-block max-w-full">
        {/* Сам статус */}
        <div className={`${baseClass} bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20 animate-pulse cursor-help`}>
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">Нужны правки</span>
        </div>

        {/* Подсказка при наведении (Tooltip) */}
        {task.rejectionReason && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/status:block w-64 p-3 bg-white dark:bg-[#282828] border border-slate-200 dark:border-[#444444] text-slate-700 dark:text-white text-[11px] rounded-xl shadow-2xl z-[100] text-center italic leading-relaxed animate-in fade-in zoom-in-95 whitespace-normal">
            <div className="font-bold mb-1 uppercase not-italic text-[9px] opacity-50">Комментарий менеджера:</div>
            «{task.rejectionReason}»
            {/* Маленький треугольник-стрелка снизу */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-[#282828]"></div>
          </div>
        )}
      </div>
    );
  }

  if (task.status === 'REACTION_UPLOADED') {
    return renderBadge({
      label: 'На проверке',
      icon: Clock,
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-500/20'
    });
  }

  if (task.status === 'IN_PROGRESS') {
    return renderBadge({
      label: 'В работе',
      icon: Zap,
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-500/20'
    });
  }

  return renderBadge({
    label: 'В очереди',
    icon: List,
    bg: 'bg-slate-50 dark:bg-slate-500/10',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-100 dark:border-slate-500/20'
  });
}

export function DateInfo({ task }) {
  // Логика: если опубликовано — показываем scheduledAt (план выхода)
  // Если нет — показываем deadline (когда должен сдать креатор)
  const isPub = task.status === 'PUBLISHED';
  const dateToDisplay = isPub ? task.scheduledAt : (task.deadline || task.createdAt);
  
  if (!dateToDisplay) return <span className="text-[11px] text-slate-500">---</span>;

  const d = new Date(dateToDisplay);
  const formattedDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Проверка просрочки: если еще НЕ опубликовано и дедлайн уже прошел
  const isOverdue = !isPub && task.deadline && new Date(task.deadline) < new Date();

  return (
    <span className={`text-[13px] min-[1150px]:text-[11px] whitespace-nowrap font-medium ${
      isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-[#cccccc]'
    }`}>
      {formattedDate}, {formattedTime}
    </span>
  );
}

export function VideoThumbnail({ src, duration, className = "" }) {
  const [isError, setIsError] = useState(false);

  const formatDuration = (s) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative bg-slate-100 dark:bg-[#161616] flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
      {(!src || isError) ? (
        // ЗАГЛУШКА
        <div className="flex flex-col items-center gap-1 opacity-20">
          <Film size={24} />
          <span className="text-[8px] font-black uppercase tracking-tighter">No Preview</span>
        </div>
      ) : (
        // КАРТИНКА
        <img 
          src={src.startsWith('http') ? src : `/${src}`} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
          alt=""
          onError={() => setIsError(true)}
        />
      )}
      
      {/* Длительность (всегда поверх) */}
      <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white tabular-nums border border-white/10">
        {formatDuration(duration)}
      </div>
    </div>
  );
}