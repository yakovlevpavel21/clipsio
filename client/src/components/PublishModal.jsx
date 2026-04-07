// client/src/components/PublishModal.jsx
import { useState, useEffect } from 'react';
import { X, Copy, RotateCcw, Check, Calendar, ExternalLink, FileVideo, Eye, Loader2, PlayCircle } from 'lucide-react';
import axios from '../api';

export default function PublishModal({ task, onClose, onSuccess }) {
  const [view, setView] = useState('reaction'); 
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(
    task.scheduledAt ? new Date(task.scheduledAt).toISOString().slice(0, 16) : ''
  );

  const reactionUrl = `/${task.reactionFilePath}`;
  const originalUrl = `/${task.originalVideo.filePath}`;

  useEffect(() => {
    if (task.scheduledAt) {
      // Превращаем дату из БД в формат для инпута
      setScheduledAt(formatToDateTimeLocal(task.scheduledAt));
    }
    
    // Инициализация данных по шаблонам из настроек канала
    const prefix = task.channel?.titlePrefix ? `${task.channel.titlePrefix} ` : '';
    setTitle(`${prefix}${task.originalVideo.title}`);

    let desc = "";
    if (task.channel?.showOriginalLink) {
      desc += `${task.channel.originalLinkPrefix || ''}${task.originalVideo.url}\n\n`;
    }
    desc += task.channel?.descriptionFooter || "";
    setDescription(desc);

    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [task]);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onPublish = async () => {
    if (!youtubeUrl) return alert("Введите ссылку на YouTube!");
    setLoading(true);
    try {
      const res = await axios.post(`/api/tasks/${task.id}/publish`, { youtubeUrl, scheduledAt });

      if (res.data.tgWarning) {
        alert(`⚠️ ${res.data.tgWarning}`);
      }

      onSuccess();
    } catch (err) { alert("Ошибка при сохранении"); }
    finally { setLoading(false); }
  };

  const onReject = async () => {
    if (!rejectionReason) return alert("Укажите причину доработки!");
    
    setLoading(true);
    try {
      const res = await axios.post(`/api/tasks/${task.id}/reject`, { reason: rejectionReason });
      
      if (res.data.tgWarning) {
        alert(`⚠️ ${res.data.tgWarning}`);
      }

      onSuccess();
    } catch (err) {
      console.error("Reject error:", err);
      alert(err.response?.data?.error || "Произошла ошибка при отклонении");
    } finally {
      setLoading(false);
    }
  };

  const formatToDateTimeLocal = (date) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000; // Учет локального часового пояса
    const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-6xl max-h-[95vh] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800 bg-white dark:bg-[#0f172a] z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
              <PlayCircle size={18} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none">Публикация ролика</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{task.channel.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          
          {/* LEFT: PLAYER */}
          <div className="lg:w-[50%] p-6 bg-slate-50 dark:bg-black/40 border-r dark:border-slate-800 flex flex-col gap-6">
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-800">
              <button onClick={() => setView('reaction')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${view === 'reaction' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>
                <FileVideo size={14} /> Реакция
              </button>
              <button onClick={() => setView('original')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${view === 'original' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500'}`}>
                <Eye size={14} /> Оригинал
              </button>
            </div>
            
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
              <video 
                key={view} 
                src={view === 'reaction' ? reactionUrl : originalUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain" 
                playsInline
              />
            </div>

            <div className="flex items-center justify-between px-1">
               <a href={task.originalVideo.url} target="_blank" className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1.5 uppercase transition-colors">
                 <ExternalLink size={12}/> Открыть оригинал в новой вкладке
               </a>
               <span className="text-[10px] font-medium text-slate-500 italic opacity-50">ID: {task.originalVideo.videoId}</span>
            </div>
          </div>

          {/* RIGHT: FORMS */}
          <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
            
            <div className="space-y-5">
              {/* TITLE */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Название видео</label>
                   <button onClick={() => handleCopy(title, 'title')} className={`text-[10px] font-bold uppercase transition-colors ${copiedField === 'title' ? 'text-green-500' : 'text-blue-500 hover:underline'}`}>
                     {copiedField === 'title' ? 'Скопировано!' : 'Копировать'}
                   </button>
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold outline-none focus:border-blue-500 transition-all" />
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Описание (Description)</label>
                   <button onClick={() => handleCopy(description, 'desc')} className={`text-[10px] font-bold uppercase transition-colors ${copiedField === 'desc' ? 'text-green-500' : 'text-blue-500 hover:underline'}`}>
                     {copiedField === 'desc' ? 'Скопировано!' : 'Копировать'}
                   </button>
                </div>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-40 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium leading-relaxed outline-none focus:border-blue-500 resize-none no-scrollbar" />
              </div>

              {/* SCHEDULING & LINK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest px-1">Запланировать на</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-red-500 tracking-widest px-1">Ссылка на Shorts</label>
                  <input placeholder="https://youtube.com/shorts/..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full bg-red-50/20 dark:bg-red-950/10 p-3 rounded-xl border border-red-200 dark:border-red-900/30 text-xs font-bold outline-none focus:border-red-500" />
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="pt-6 border-t dark:border-slate-800">
              {isRejecting ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <textarea autoFocus placeholder="Укажите причину доработки (что исправить?)..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-sm outline-none font-medium min-h-[100px]" />
                  <div className="flex gap-2">
                    <button onClick={() => setIsRejecting(false)} className="flex-1 py-3 text-xs font-bold uppercase text-slate-500 hover:text-slate-700">Отмена</button>
                    <button onClick={onReject} disabled={loading} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50">
                      {loading ? <Loader2 className="animate-spin inline mr-2" size={14}/> : 'Отклонить видео'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setIsRejecting(true)} className="w-full h-16 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 font-bold text-[11px] uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-800 rounded-2xl active:scale-95">
                    <RotateCcw size={18}/>
                    <span>На доработку</span>
                  </button>
                  <button onClick={onPublish} disabled={loading} className="w-full h-16 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin mr-2" size={20}/> : <Check size={20} strokeWidth={3} />}
                    <span>Опубликовано</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}