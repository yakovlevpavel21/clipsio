import { useState, useEffect, useRef, useCallback, memo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getPreferences, updatePreferences, markNotifRead, socket, subscribeUserToPush } from '../api';
import { Bell, BellOff, ShieldAlert, CheckCircle2, Loader2, Video, Calendar as CalendarIcon } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const navigate = useNavigate();
  const observer = useRef();

  useEffect(() => {
    loadInitialData();
    socket.on('new_notification', loadInitialData);
    return () => socket.off('new_notification');
  }, []);

  const loadInitialData = async () => {
    try {
      const [notifsRes, prefsRes] = await Promise.all([getNotifications(0, 15), getPreferences()]);
      setNotifications(notifsRes.data);
      setIsEnabled(prefsRes.data.enabled);
      setHasMore(notifsRes.data.length === 15);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchMore = async () => {
    if (isFetching || !hasMore) return;
    setIsFetching(true);
    try {
      const res = await getNotifications(notifications.length, 15);
      setNotifications(prev => [...prev, ...res.data]);
      setHasMore(res.data.length === 15);
    } catch (e) { console.error(e); }
    finally { setIsFetching(false); }
  };

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchMore();
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, notifications.length]);

  const handleItemVisible = (id, isRead) => {
    if (!isRead) {
      markNotifRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      // Генерируем событие для Layout, чтобы точка исчезла сразу
      socket.emit('notif_read_locally'); 
    }
  };

  const handleNotifClick = (n) => {
    const targetPath = n.type === 'REACTION_UPLOADED' ? '/manager' : '/creator';
    
    navigate(targetPath, { 
      state: { 
        scrollToTaskId: n.taskId,
        targetTab: n.targetTab // Передаем вкладку
      } 
    });
  };

  // ГРУППИРОВКА ПО ДАТАМ
  const groupedNotifications = notifications.reduce((groups, n) => {
    const date = new Date(n.createdAt).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(n);
    return groups;
  }, {});

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-50" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 font-['Inter']">
      <header className="pt-10 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Уведомления</h1>
          <p className="text-sm text-slate-500 mt-2">История событий Clipsio</p>
        </div>
        <button 
          onClick={async () => {
            const newStatus = !isEnabled;
            if (newStatus) await subscribeUserToPush();
            setIsEnabled(newStatus);
            await updatePreferences({ enabled: newStatus });
          }}
          className={`flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-bold text-xs uppercase transition-all ${isEnabled ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
        >
          {isEnabled ? <Bell size={16}/> : <BellOff size={16}/>}
          {isEnabled ? "Включены" : "Выключены"}
        </button>
      </header>

      <div className="space-y-8">
        {Object.entries(groupedNotifications).map(([date, items]) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center gap-4 px-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{date}</span>
              <div className="h-px bg-slate-200 dark:border-slate-800 w-full" />
            </div>
            <div className="space-y-3">
              {items.map((n, idx) => (
                <NotificationItem 
                  key={n.id} 
                  notif={n} 
                  onClick={() => handleNotifClick(n)}
                  onVisible={() => handleItemVisible(n.id, n.isRead)}
                  ref={notifications.indexOf(n) === notifications.length - 1 ? lastElementRef : null}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {isFetching && <div className="text-center py-10"><Loader2 className="animate-spin inline text-blue-500" /></div>}
    </div>
  );
}

const NotificationItem = memo(forwardRef(({ notif, onClick, onVisible }, ref) => {
  const itemRef = useRef();

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onVisible();
        obs.disconnect();
      }
    }, { threshold: 0.7 });
    if (itemRef.current) obs.observe(itemRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div 
      ref={node => { itemRef.current = node; if (ref) ref(node); }}
      onClick={onClick}
      className={`p-4 md:p-5 rounded-[1.5rem] border cursor-pointer transition-all ${notif.isRead ? 'bg-white/40 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-slate-900 border-blue-500/20 shadow-md ring-1 ring-blue-500/5'}`}
    >
      <div className="flex gap-4">
        <div className={`p-3 rounded-xl h-fit ${notif.type === 'REVISION_NEEDED' ? 'bg-red-500/10 text-red-500' : notif.type === 'PUBLISHED' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
           {notif.type === 'REVISION_NEEDED' ? <ShieldAlert size={20}/> : notif.type === 'PUBLISHED' ? <CheckCircle2 size={20}/> : <Video size={20}/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base truncate pr-2">{notif.title}</h3>
            <span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase shrink-0">
              {new Date(notif.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-snug">{notif.message}</p>
        </div>
      </div>
    </div>
  );
}));