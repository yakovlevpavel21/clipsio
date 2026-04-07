import { Users, Trash2, Edit3, BarChart2, Plus } from 'lucide-react';

export default function AdminUsers({ users, now, onEdit, onDelete, onAdd }) {
  
  const getUserStatus = (user) => {
    if (user.isOnline) return { label: 'В сети', color: 'text-emerald-500', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' };
    if (!user.lastActive) return { label: 'Офлайн', color: 'text-slate-400', dot: 'bg-slate-300 dark:bg-slate-600' };

    const last = new Date(user.lastActive).getTime();
    const diff = Math.floor((now.getTime() - last) / 60000);

    if (diff < 1) return { label: 'Только что', color: 'text-slate-400', dot: 'bg-slate-400' };
    if (diff < 60) return { label: `${diff}м назад`, color: 'text-slate-400', dot: 'bg-slate-300 dark:bg-slate-600' };
    
    return { 
      label: new Date(user.lastActive).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), 
      color: 'text-slate-400', dot: 'bg-slate-300 dark:bg-slate-600' 
    };
  };

  // Базовый стиль для кнопок действий внизу карточки
  const actionBtnClass = "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-100 dark:hover:border-blue-800/50 active:scale-95";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Сотрудники</h3>
        <button 
          onClick={onAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        {users.map(u => {
          const status = getUserStatus(u);
          return (
            <div key={u.id} className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col p-4 transition-all hover:border-blue-500/30">
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 shrink-0">
                    <Users size={22} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white uppercase text-[13px] truncate leading-none mb-2">
                      {u.username}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-wrap h-4">
                      <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded leading-none">
                        {u.role}
                      </span>
                      
                      <div className="flex items-center gap-1.5 leading-none">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot} ${u.isOnline ? 'animate-pulse' : ''}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onDelete('users', u.id)}
                  className="p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* BOTTOM ACTIONS */}
              <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button 
                  onClick={() => onEdit(u)}
                  className={actionBtnClass}
                >
                  <Edit3 size={14} />
                  <span>Правка</span>
                </button>
                
                <button className={actionBtnClass}>
                  <BarChart2 size={14} />
                  <span>Статистика</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}