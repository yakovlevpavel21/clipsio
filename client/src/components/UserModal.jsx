import { useState, useEffect } from 'react';
import { X, User, Lock, Send, Save, UserPlus, Shield } from 'lucide-react';

export default function UserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'CREATOR',
    tgUsername: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        password: '', // Пароль не показываем в целях безопасности
        role: user.role || 'CREATOR',
        tgUsername: user.tgUsername || ''
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#1a1f2e] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
              {user ? <Save size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {user ? 'Редактировать сотрудника' : 'Новый сотрудник'}
              </h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Данные доступа Clipsio</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Логин */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Логин (Имя в системе)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 p-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Пароль */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                {user ? 'Новый пароль (оставьте пустым, если не меняете)' : 'Пароль'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="password"
                  required={!user}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 p-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Роль */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Роль / Уровень доступа</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 p-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold outline-none cursor-pointer appearance-none"
                >
                  <option value="CREATOR">Креатор (только съемка)</option>
                  <option value="MANAGER">Менеджер (загрузка/задачи)</option>
                  <option value="ADMIN">Администратор (полный доступ)</option>
                </select>
              </div>
            </div>

            {/* Telegram */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Telegram ник (для уведомлений)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">@</span>
                <input 
                  placeholder="username"
                  value={formData.tgUsername}
                  onChange={e => setFormData({...formData, tgUsername: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 p-3 pl-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {user ? <Save size={16} /> : <UserPlus size={16} />}
            {user ? 'Сохранить изменения' : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
}