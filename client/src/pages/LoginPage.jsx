// client/src/pages/LoginPage.jsx
import { useState } from 'react';
import axios from '../api';
import { Zap, Loader2, Lock, User } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1c] px-4 font-['Inter']">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/40 mx-auto">
            <Zap size={32} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">Clipsio</h1>
          <p className="text-slate-500 font-medium">Войдите в систему управления контентом</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1f2e] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold rounded-xl text-center border border-red-100 dark:border-red-900/30 uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Логин</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pl-12 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                placeholder="Ваше имя"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type="password"
                className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 pl-12 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500 transition-all font-medium text-sm"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Войти в панель"}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] opacity-50">
          Clipsio System v1.0
        </p>
      </div>
    </div>
  );
}