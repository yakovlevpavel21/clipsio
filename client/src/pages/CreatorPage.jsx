// client/src/pages/CreatorPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Zap, X } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import UploadModal from '../components/UploadModal';
import VideoModal from '../components/VideoModal';

export default function CreatorPage() {
  const [tasks, setTasks] = useState({ available: [], my: [], history: [] });
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [tab, setTab] = useState('my'); 
  const [loading, setLoading] = useState(true);
  const [uploadTarget, setUploadTarget] = useState(null);
  
  // Оставляем только один стейт для плеера
  const [activePreview, setActivePreview] = useState(null); 

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [avail, mine, hist, chan] = await Promise.all([
        axios.get('http://localhost:5000/api/tasks/available'),
        axios.get('http://localhost:5000/api/tasks/my-work'),
        axios.get('http://localhost:5000/api/tasks/history'),
        axios.get('http://localhost:5000/api/channels')
      ]);
      setTasks({ available: avail.data, my: mine.data, history: hist.data });
      setChannels(chan.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCancelUpload = async (id) => {
    if (!confirm("Отозвать видео с проверки? Оно вернется во вкладку 'В процессе'.")) return;
    try {
      await axios.post(`http://localhost:5000/api/tasks/${id}/cancel-upload`);
      fetchAll();
    } catch (err) { alert("Ошибка при отмене"); }
  };

  // Функция открытия нового плеера
  const handleOpenPreview = (task, type = 'original') => {
    const url = type === 'original' 
      ? `http://localhost:5000/${task.originalVideo.filePath}`
      : `http://localhost:5000/${task.reactionFilePath}`;
    
    setActivePreview({
      url,
      title: task.originalVideo.title,
      channel: task.channel?.name
    });
  };

  const filterFn = (task) => selectedChannel === 'all' || task.channelId === parseInt(selectedChannel);
  const currentTasks = tasks[tab].filter(filterFn);

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-blue-500 font-semibold text-sm uppercase tracking-widest animate-pulse">Загрузка...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 font-['Inter']">
      
      {/* --- HEADER --- */}
      <header className="pt-10 mb-8 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
        {/* Блок с приветствием и счетчиком */}
        <div className="flex items-center justify-between mb-3"> {/* Добавлен mb-3 для отступа вниз */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap size={20} className="text-white" fill="currentColor" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Привет, {JSON.parse(localStorage.getItem('user'))?.username}!
            </h1>
          </div>
          
          {/* Личный счетчик на сегодня */}
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Твой прогресс сегодня</p>
            <p className="text-xl font-bold text-emerald-500 tabular-nums">
              {tasks.history.filter(t => new Date(t.updatedAt).toDateString() === new Date().toDateString()).length} видео
            </p>
          </div>
        </div>

        {/* Описание таба (теперь с отступом сверху благодаря mb-3 выше) */}
        <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl leading-relaxed">
          {tab === 'my' && "Загрузите готовые реакции на проверку."}
          {tab === 'available' && "Выберите видео и забронируйте его для работы."}
          {tab === 'history' && "Здесь можно отслеживать статус публикации и ваши результаты."}
        </p>
      </header>

      {/* --- STICKY TABS & FILTERS --- */}
      <div className="sticky top-0 lg:top-0 max-lg:top-[65px] z-40 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md -mx-4 px-4 pt-4 pb-4 border-b dark:border-slate-800">
        <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 mb-5">
          <TabBtn label="В процессе" active={tab === 'my'} onClick={() => setTab('my')} hasBadge={tasks.my.length > 0} />
          <TabBtn label="Свободные" active={tab === 'available'} onClick={() => setTab('available')} hasBadge={tasks.available.length > 0} />
          <TabBtn label="История" active={tab === 'history'} onClick={() => setTab('history')} />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <FilterBtn label="Все каналы" active={selectedChannel === 'all'} onClick={() => setSelectedChannel('all')} />
          {channels.map(ch => (
            <FilterBtn key={ch.id} label={ch.name} active={selectedChannel === ch.id} onClick={() => setSelectedChannel(ch.id)} />
          ))}
        </div>
      </div>

      <div className="mt-8 px-1">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
          {tab === 'my' ? `Текущих задач: ${tasks.my.length}` : tab === 'available' ? `Доступно видео: ${tasks.available.length}` : `Всего в истории: ${tasks.history.length}`}
        </p>
      </div>

      {/* --- TASK LIST --- */}
      <div className="mt-5 space-y-4">
        {currentTasks.length === 0 ? (
          <div className="py-24 text-center text-slate-400 text-sm font-medium uppercase tracking-widest opacity-50 border-2 border-dashed dark:border-slate-800 rounded-[2rem]">
            Здесь пока пусто
          </div>
        ) : (
          currentTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              mode={tab}
              // ВАЖНО: вызываем новую функцию handleOpenPreview
              onPreview={handleOpenPreview} 
              onUpload={() => setUploadTarget(task)}
              onClaim={() => axios.post(`http://localhost:5000/api/tasks/${task.id}/claim`).then(fetchAll)}
              onAbandon={() => confirm("Отказаться?") && axios.post(`http://localhost:5000/api/tasks/${task.id}/abandon`).then(fetchAll)}
              onCancelUpload={handleCancelUpload}
            />
          ))
        )}
      </div>

      {/* MODALS */}
      {activePreview && (
        <VideoModal 
          url={activePreview.url}
          title={activePreview.title}
          channel={activePreview.channel}
          onClose={() => setActivePreview(null)}
        />
      )}

      {uploadTarget && (
        <UploadModal 
          task={uploadTarget} 
          onClose={() => setUploadTarget(null)} 
          onSuccess={() => { setUploadTarget(null); fetchAll(); }} 
        />
      )}
      
    </div>
  );
}

function TabBtn({ label, active, onClick, hasBadge }) {
  return (
    <button onClick={onClick} className={`relative flex-1 py-3 rounded-xl text-xs md:text-[13px] font-bold transition-all ${active ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
      {label}
      {hasBadge && <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />}
    </button>
  );
}

function FilterBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-5 py-2 rounded-xl text-[11px] md:text-xs font-bold whitespace-nowrap border transition-all ${active ? 'bg-blue-600 border-blue-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'}`}>
      {label}
    </button>
  );
}