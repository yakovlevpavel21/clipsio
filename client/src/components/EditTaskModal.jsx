// client/src/components/EditTaskModal.jsx
import { useState, useEffect } from 'react';
import api from '../api';
import { X, Calendar, Clock, User, Save, Loader2, Info } from 'lucide-react';

export default function EditTaskModal({ task, creators, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    deadline: '',
    scheduledAt: '',
    creatorId: ''
  });

  // Функция для приведения даты к формату input datetime-local (YYYY-MM-DDTHH:mm)
  const formatToDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (task) {
      setFormData({
        deadline: task.deadline ? formatToDateTimeLocal(task.deadline) : '',
        scheduledAt: task.scheduledAt ? formatToDateTimeLocal(task.scheduledAt) : '',
        creatorId: task.creatorId ? String(task.creatorId) : ''
      });
    }
    // Блокируем скролл
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [task]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/api/tasks/${task.id}`, {
        deadline: formData.deadline || null,
        scheduledAt: formData.scheduledAt || null,
        creatorId: formData.creatorId ? parseInt(formData.creatorId) : null
      });
      onSuccess();
    } catch (err) {
      alert("Не удалось сохранить изменения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 overflow-hidden font-['Inter']">
      {/* Затемнение */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      
      {/* Окно */}
      <div className="relative bg-white dark:bg-[#1a1f2e] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Кнопка закрытия */}
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all z-50">
          <X size={22} />
        </button>
        
        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 dark:border-amber-800/50 shadow-sm">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Правка задачи</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {task.id} • {task.channel.name}</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* ВЫБОР КРЕАТОРА */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                <User size={12} /> Назначить исполнителя
              </label>
              <select 
                value={formData.creatorId}
                onChange={(e) => setFormData({...formData, creatorId: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
              >
                <option value="">-- В общую ленту (без креатора) --</option>
                {creators.map(c => (
                  <option key={c.id} value={c.id}>{c.username}</option>
                ))}
              </select>
            </div>

            {/* ДАТА ПУБЛИКАЦИИ */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                <Calendar size={12} /> Дата выхода на YouTube
              </label>
              <input 
                type="datetime-local" 
                value={formData.scheduledAt}
                onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold outline-none focus:border-blue-500 transition-all text-slate-600 dark:text-slate-300"
              />
            </div>

            {/* ДЕДЛАЙН */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                <Clock size={12} /> Срок для креатора (Дедлайн)
              </label>
              <input 
                type="datetime-local" 
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold outline-none focus:border-blue-500 transition-all text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>

          <div className="pt-4 border-t dark:border-slate-800">
            <button 
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              <span>{loading ? 'Сохранение...' : 'Обновить задачу'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}