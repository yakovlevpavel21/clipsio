// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import axios, { socket } from '../api'; // Импортируем сокет для real-time
import { 
  CheckCircle2, Clock, Send, Layers, ArrowUpRight, PlayCircle, Activity, Zap, Users, Loader2, Video
} from 'lucide-react';
import PageStatus from '../components/PageStatus';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Слушаем изменения статуса
    socket.on('status_change', (data) => {
      setStats(prev => {
        if (!prev || !prev.creators) return prev;
        
        return {
          ...prev,
          creators: prev.creators.map(c => {
            // Сверяем ID (приводим к числу для надежности)
            if (Number(c.id) === Number(data.userId)) {
              return { ...c, isOnline: data.online };
            }
            return c;
          })
        };
      });
    });

    return () => socket.off('status_change');
  }, []);

  if (loading || error) {
    return <PageStatus loading={loading} error={error} onRetry={fetchStats} />;
  }

  if (!stats || !stats.counters) return null;

  const { counters, channels, recent, creators } = stats;

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 font-['Inter']">
      
      {/* HEADER */}
      <header className="pt-10 mb-10 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Дашборд
        </h1>
        <p className="text-sm md:text-base text-slate-500 font-medium mt-2">
          Общий обзор производительности Clipsio в реальном времени.
        </p>
      </header>

      {/* STAT CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatCard title="Всего" value={counters.totalTasks} icon={<Layers size={20} />} color="blue" />
        <StatCard title="Ожидают" value={counters.awaiting} icon={<Clock size={20} />} color="amber" />
        <StatCard title="Проверка" value={counters.submitted} icon={<Send size={20} />} color="indigo" />
        <StatCard title="Готово" value={counters.published} icon={<CheckCircle2 size={20} />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="space-y-6">
          {/* TOP CREATORS WIDGET */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" /> Топ Креаторов
            </h3>
            <div className="space-y-5">
              {creators?.map((creator, idx) => {
                // Считаем онлайн либо по флагу из сокетов, либо по времени из базы
                const isOnline = creator.isOnline || (creator.lastActive && (new Date() - new Date(creator.lastActive)) / 60000 < 3);
                
                return (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      {/* ИСПОЛЬЗУЕМ ТОЛЬКО isOnline */}
                      <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                        creator.isOnline 
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' 
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`} />
                      
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
                        {creator.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                        {creator.count}
                      </span>
                      <Video size={10} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
              {!creators?.length && <p className="text-[10px] text-center text-slate-400 font-bold uppercase">Нет данных</p>}
            </div>
          </div>

          {/* EFFICIENCY WIDGET */}
          <div className="bg-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
            <Zap className="absolute -right-6 -bottom-6 text-white/10 group-hover:rotate-12 transition-transform duration-700" size={150} />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Эффективность</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-5xl font-bold tracking-tighter">
                {counters.totalTasks ? Math.round((counters.published / counters.totalTasks) * 100) : 0}%
              </p>
              <ArrowUpRight size={24} className="text-emerald-300" />
            </div>
            <p className="text-[11px] font-medium mt-4 opacity-70">Процент завершенных задач</p>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT ACTIVITY */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
               <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" /> Последние события
               </h3>
               <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded uppercase tracking-tighter">Live Feed</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {recent.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/30 dark:bg-slate-900/30 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all">
                  <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    <img src={`/${task.originalVideo?.thumbnailPath}`} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase text-blue-500 mb-0.5">{task.channel?.name}</p>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight">
                      {task.originalVideo?.title}
                    </h4>
                    <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase">
                      {new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase shadow-sm ${
                    task.status === 'PUBLISHED' ? 'bg-emerald-500 text-white' :
                    task.status === 'REACTION_UPLOADED' ? 'bg-blue-500 text-white' :
                    task.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                    'bg-slate-400 text-white'
                  }`}>
                    {task.status === 'REACTION_UPLOADED' ? 'Проверка' : task.status === 'IN_PROGRESS' ? 'Работа' : task.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800",
  };

  return (
    <div className="bg-white dark:bg-[#1a1f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tighter tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}