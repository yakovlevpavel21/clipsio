import { useState, useEffect } from 'react';
import api from '../../api';
import { X, Calendar, Clock, User, Save, Loader2 } from 'lucide-react';
import HourlyPicker from '../HourlyPicker';

export default function EditTaskModal({ task, creators, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    deadline: '',
    scheduledAt: '',
    creatorId: ''
  });

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
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalStyle; };
  }, [task]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowHour = now.getHours();

  // Обновленный обработчик изменений
  const handleDateChange = (field, value) => {
    setFormData(prev => {
      let newData = { ...prev, [field]: value };
      
      // Если меняем время публикации
      if (field === 'scheduledAt' && value) {
        const pubDate = new Date(value);
        
        // Вычитаем ровно 1 час (Date сам переключит день на вчера, если сейчас 00:00)
        pubDate.setHours(pubDate.getHours() - 1);
        
        // Форматируем локально, чтобы избежать UTC-сдвига (важно!)
        const y = pubDate.getFullYear();
        const m = String(pubDate.getMonth() + 1).padStart(2, '0');
        const d = String(pubDate.getDate()).padStart(2, '0');
        const h = String(pubDate.getHours()).padStart(2, '0');
        
        newData.deadline = `${y}-${m}-${d}T${h}:00`;
      }

      // Финальная проверка: дедлайн не может быть позже публикации
      if (newData.deadline && newData.scheduledAt) {
        if (new Date(newData.deadline) > new Date(newData.scheduledAt)) {
          newData.deadline = newData.scheduledAt;
        }
      }

      return newData;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.creatorId) return alert("Необходимо выбрать исполнителя!");

    setLoading(true);
    try {
      await api.patch(`/api/tasks/${task.id}`, {
        deadline: formData.deadline || null,
        scheduledAt: formData.scheduledAt || null,
        creatorId: parseInt(formData.creatorId)
      });
      onSuccess();
    } catch (err) {
      alert("Не удалось сохранить изменения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-0 md:p-4 overflow-hidden font-['Inter']">
      {/* Затемнение фона */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#1f1f1f] w-full max-w-lg h-full md:h-auto md:max-h-[90vh] md:rounded-2xl shadow-2xl border border-slate-200 dark:border-[#333333] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ХЕДЕР */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">Правка задачи</h2>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{task.channel?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#333333] rounded-full transition-all text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* ТЕЛО ФОРМЫ */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-white dark:bg-[#1f1f1f]">
          <form id="edit-form" onSubmit={handleSave} className="space-y-6">
            
            {/* ИСПОЛНИТЕЛЬ */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 flex items-center gap-2">
                <User size={12} /> Исполнитель <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select 
                  required
                  value={formData.creatorId}
                  onChange={(e) => setFormData({...formData, creatorId: e.target.value})}
                  className="w-full appearance-none bg-slate-50 dark:bg-[#161616] p-4 rounded-xl border border-slate-200 dark:border-[#333333] text-sm font-bold outline-none focus:border-blue-600 transition-all cursor-pointer text-slate-900 dark:text-[#f1f1f1]"
                >
                  <option value="" disabled>Выберите из списка</option>
                  {creators.map(c => (
                    <option key={c.id} value={c.id} className="dark:bg-[#1f1f1f]">{c.username}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <HourlyPicker 
                label="План публикации"
                icon={Calendar}
                value={formData.scheduledAt}
                minDate={today}
                minHour={nowHour + 1}
                onChange={(val) => handleDateChange('scheduledAt', val)}
              />

              <HourlyPicker 
                label="Дедлайн креатора"
                icon={Clock}
                value={formData.deadline}
                minDate={today}
                minHour={nowHour}
                onChange={(val) => handleDateChange('deadline', val)}
              />
            </div>
          </form>
        </div>

        {/* ФУТЕР */}
        <div className="p-5 border-t border-slate-100 dark:border-[#333333] bg-slate-50 dark:bg-black/20 shrink-0">
          <button 
            form="edit-form"
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span>{loading ? 'Обновление...' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}