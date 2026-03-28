// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Video, CheckCircle2, Clock, 
  Send, Layers, ArrowUpRight, PlayCircle, Activity, Zap, Users
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/stats');
        setStats(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading || !stats) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Загрузка аналитики...</span>
    </div>
  );

  const { counters, channels, recent } = stats;

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 font-['Inter']">
      
      {/* HEADER */}
      <header className="pt-10 mb-10 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity size={22} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Дашборд
          </h1>
        </div>
        <p className="text-sm md:text-base text-slate-500 font-medium">Общий обзор производительности ClipFlow в реальном времени.</p>
      </header>

      {/* STAT CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatCard title="Всего" value={counters.totalTasks} icon={<Layers size={20} />} color="blue" />
        <StatCard title="Ожидают" value={counters.awaiting} icon={<Clock size={20} />} color="amber" />
        <StatCard title="Проверка" value={counters.submitted} icon={<Send size={20} />} color="indigo" />
        <StatCard title="Готово" value={counters.published} icon={<CheckCircle2 size={20} />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: EFFICIENCY & CHANNELS */}
        <div className="space-y-6">

          <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" /> Топ Креаторов
            </h3>
            <div className="space-y-4">
              {stats.creators?.map((creator, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-semibold dark:text-slate-200">{creator.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                    {creator.count} видео
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* EFFICIENCY WIDGET */}
          <div className="bg-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group transition-all hover:scale-[1.01]">
            <Zap className="absolute -right-6 -bottom-6 text-white/10 group-hover:rotate-12 transition-transform duration-700" size={150} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Конверсия системы</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-5xl font-bold tracking-tighter">
                {counters.totalTasks ? Math.round((counters.published / counters.totalTasks) * 100) : 0}%
              </p>
              <ArrowUpRight size={24} className="text-emerald-300" />
            </div>
            <p className="text-[11px] font-medium mt-4 opacity-70">Процент опубликованных видео от общего количества задач</p>
          </div>

          {/* CHANNELS PROGRESS */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <PlayCircle size={16} className="text-red-500" /> Активность каналов
            </h3>
            <div className="space-y-5">
              {channels.map((ch, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                    <span className="text-slate-700 dark:text-slate-300">{ch.name}</span>
                    <span className="text-slate-400">{ch.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: counters.totalTasks > 0 ? `${(ch.count / counters.totalTasks) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
              {channels.length === 0 && <p className="text-[10px] text-slate-500 text-center font-bold uppercase">Каналы не созданы</p>}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT ACTIVITY */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" /> Последние события
               </h3>
               <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded uppercase">Live Feed</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {recent.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all group">
                  <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white dark:border-slate-700 shadow-sm">
                    {task.originalVideo?.thumbnailPath ? (
                      <img src={`http://localhost:5000/${task.originalVideo.thumbnailPath}`} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-0.5">{task.channel?.name}</p>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight">
                      {task.originalVideo?.title}
                    </h4>
                    <p className="text-[9px] font-medium text-slate-400 uppercase mt-0.5">
                      {new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-tighter shadow-sm ${
                    task.status === 'PUBLISHED' ? 'bg-emerald-500 text-white' :
                    task.status === 'REACTION_UPLOADED' ? 'bg-blue-500 text-white' :
                    task.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                    'bg-slate-400 text-white'
                  }`}>
                    {
                      task.status === 'REACTION_UPLOADED' ? 'Проверка' : 
                      task.status === 'IN_PROGRESS' ? 'В процессе' : 
                      task.status === 'PUBLISHED' ? 'Опубликовано' :
                      task.status
                    }
                  </div>
                </div>
              ))}
              {recent.length === 0 && <p className="py-20 text-center text-[10px] font-bold text-slate-400 uppercase">Нет последних действий</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// COMPONENT: STAT CARD
function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800",
  };

  return (
    <div className="bg-white dark:bg-[#1a1f2e] p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
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

function Loader2({ className, size }) {
  return <LoaderCircle className={className} size={size} />;
}
import { LoaderCircle } from 'lucide-react';