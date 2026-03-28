// client/src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Tv, ShieldCheck, Globe, Trash2, Plus, 
  Save, Key, UserPlus, Settings as SettingsIcon,
  Shield, CheckCircle2, AlertCircle, Type, Info
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users'); // users, channels, settings
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [proxy, setProxy] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Формы
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'CREATOR' });
  const [newChannel, setNewChannel] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, c, s] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users'),
        axios.get('http://localhost:5000/api/channels'),
        axios.get('http://localhost:5000/api/admin/settings')
      ]);
      setUsers(u.data);
      setChannels(c.data);
      const proxySetting = s.data.find(i => i.key === 'proxy_url');
      if (proxySetting) setProxy(proxySetting.value);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    await axios.post('http://localhost:5000/api/admin/users', newUser);
    setNewUser({ username: '', password: '', role: 'CREATOR' });
    fetchData();
  };

  const handleAddChannel = async () => {
    if (!newChannel) return;
    await axios.post('http://localhost:5000/api/admin/channels', { name: newChannel });
    setNewChannel('');
    fetchData();
  };

  const updateChannel = async (id, data) => {
    try {
      await axios.patch(`http://localhost:5000/api/admin/channels/${id}`, data);
    } catch (err) { alert("Ошибка сохранения"); }
  };

  const saveProxy = async () => {
    await axios.post('http://localhost:5000/api/admin/settings', { key: 'proxy_url', value: proxy });
    alert("Настройки прокси обновлены");
  };

  const deleteItem = async (type, id) => {
    if (!confirm("Удалить безвозвратно?")) return;
    await axios.delete(`http://localhost:5000/api/admin/${type}/${id}`);
    fetchData();
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-blue-500 font-semibold text-xs uppercase tracking-widest animate-pulse">Загрузка системы...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 font-['Inter']">
      
      {/* HEADER */}
      <header className="pt-10 mb-8 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
            <Shield size={20} className="text-white dark:text-slate-900" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Админ-центр
          </h1>
        </div>
        <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl leadind-relaxed">
          Управление пользователями, каналами и системными конфигурациями ClipFlow.
        </p>
      </header>

      {/* TABS */}
      <div className="sticky top-0 lg:top-0 max-lg:top-[65px] z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md -mx-4 px-4 pt-4 pb-4 border-b dark:border-slate-800 transition-all">
        <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 shadow-inner">
          <button onClick={() => setActiveTab('users')} className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Сотрудники</button>
          <button onClick={() => setActiveTab('channels')} className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'channels' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Каналы</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Настройки</button>
        </div>
      </div>

      <div className="mt-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {/* ВКЛАДКА: СОТРУДНИКИ */}
        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-[#1a1f2e] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                <UserPlus size={16} /> Новый сотрудник
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="Логин" className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm outline-none focus:border-blue-500" />
                <input value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Пароль" className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm outline-none focus:border-blue-500" />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm outline-none font-semibold">
                  <option value="CREATOR">Креатор</option>
                  <option value="MANAGER">Менеджер / Загрузчик</option>
                  <option value="ADMIN">Администратор</option>
                </select>
                <button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                  Добавить
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(u => (
                <div key={u.id} className="bg-white dark:bg-[#1a1f2e] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors relative">
                      <Users size={24} />
                      {/* Маленький индикатор онлайна или активности */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#1a1f2e] rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{u.username}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{u.role}</p>
                        {/* Показываем количество выполненных задач, если роль CREATOR */}
                        {u.role === 'CREATOR' && (
                          <span className="text-[10px] text-slate-400">• {u._count?.tasks || 0} выполнено</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteItem('users', u.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА: КАНАЛЫ */}
        {activeTab === 'channels' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#1a1f2e] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <input value={newChannel} onChange={e => setNewChannel(e.target.value)} placeholder="Название нового канала..." className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none focus:border-blue-500" />
              <button onClick={handleAddChannel} className="h-14 px-8 bg-blue-600 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                <Plus size={18}/> Добавить канал
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {channels.map(c => (
                <div key={c.id} className="bg-white dark:bg-[#1a1f2e] p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Название канала</label>
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-transparent focus:border-blue-500 dark:text-white font-bold uppercase text-sm outline-none"
                        defaultValue={c.name}
                        onBlur={(e) => updateChannel(c.id, { name: e.target.value })}
                      />
                    </div>
                    <button onClick={() => deleteItem('channels', c.id)} className="mt-4 p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Префикс названия (YouTube Title)</label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-transparent focus:border-blue-500 text-xs font-semibold outline-none"
                      defaultValue={c.titlePrefix}
                      onBlur={(e) => updateChannel(c.id, { titlePrefix: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Описание (Footer / Contact Email)</label>
                    <textarea 
                      className="w-full bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-transparent focus:border-blue-500 text-[11px] font-medium leading-relaxed h-32 outline-none resize-none"
                      defaultValue={c.descriptionFooter}
                      onBlur={(e) => updateChannel(c.id, { descriptionFooter: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА: НАСТРОЙКИ (PROXY) */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-8 bg-white dark:bg-[#1a1f2e] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-blue-500">
                <Globe size={24}/>
                <h3 className="text-lg font-bold uppercase tracking-tight">Proxy Сервер</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Настройте глобальный прокси для всех запросов к YouTube (инфо и скачивание).
              </p>
              <div className="space-y-4">
                 <input 
                  value={proxy} 
                  onChange={e => setProxy(e.target.value)} 
                  placeholder="http://user:pass@host:port" 
                  className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono outline-none focus:border-blue-500 transition-all" 
                />
                <button onClick={saveProxy} className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase text-xs tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl">
                  <Save size={18}/> Сохранить настройки
                </button>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl flex gap-3 items-start border border-blue-100 dark:border-blue-900/30">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  Если прокси требует авторизации, используйте формат: <br />
                  <code className="bg-white/50 dark:bg-black/20 px-1 rounded">http://username:password@ip:port</code>
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}