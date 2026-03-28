// client/src/components/PublishModal.jsx
import { useState, useEffect } from 'react';
import { X, Copy, RotateCcw, Check, PlayCircle, Calendar, ExternalLink, FileVideo, Eye } from 'lucide-react';
import axios from 'axios';

export default function PublishModal({ task, onClose, onSuccess }) {
  const [view, setView] = useState('reaction'); 
  const [title, setTitle] = useState(`${task.channel?.titlePrefix || ''} ${task.originalVideo.title}`);
  const [description, setDescription] = useState(`CREDIT - ${task.originalVideo.url}\n\n${task.channel?.descriptionFooter || ''}`);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const reactionUrl = `http://localhost:5000/${task.reactionFilePath}`;
  const originalUrl = `http://localhost:5000/${task.originalVideo.filePath}`;

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onPublish = async () => {
    if (!youtubeUrl) return alert("Введите ссылку на YouTube!");
    try {
      await axios.post(`http://localhost:5000/api/tasks/${task.id}/publish`, { youtubeUrl, scheduledAt });
      onSuccess();
    } catch (err) { alert("Ошибка сохранения"); }
  };

  const onReject = async () => {
    if (!rejectionReason) return alert("Укажите причину!");
    try {
      await axios.post(`http://localhost:5000/api/tasks/${task.id}/reject`, { reason: rejectionReason });
      onSuccess();
    } catch (err) { alert("Ошибка"); }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 md:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-6xl max-h-[95vh] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800 bg-white dark:bg-[#0f172a] z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
              <PlayCircle size={18} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none">Публикация</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{task.channel.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          
          {/* СЛЕВА: ГОРИЗОНТАЛЬНЫЙ ПЛЕЕР */}
          <div className="lg:w-[55%] p-6 bg-slate-50 dark:bg-black/40 border-r dark:border-slate-800 flex flex-col gap-6">
            
            {/* ТАБЫ ПЛЕЕРА */}
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border dark:border-slate-800">
              <button onClick={() => setView('reaction')} className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${view === 'reaction' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>
                <FileVideo size={14} /> Моя Реакция
              </button>
              <button onClick={() => setView('original')} className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${view === 'original' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500'}`}>
                <Eye size={14} /> Оригинал
              </button>
            </div>
            
            {/* КОНТЕЙНЕР 16:9 */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/5 group">
              <video 
                key={view} 
                src={view === 'reaction' ? reactionUrl : originalUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain" 
              />
              <div className="absolute top-4 left-4 pointer-events-none">
                <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 rounded-lg border border-white/10 uppercase tracking-widest">
                  {view === 'reaction' ? 'Preview: Reaction' : 'Preview: Original'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
               <a href={task.originalVideo.url} target="_blank" className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1.5 uppercase tracking-tight transition-colors">
                 <ExternalLink size={12}/> Посмотреть на YouTube
               </a>
               <span className="text-[10px] font-medium text-slate-500 italic">ID: {task.originalVideo.videoId}</span>
            </div>
          </div>

          {/* СПРАВА: ФОРМЫ РЕДАКТИРОВАНИЯ */}
          <div className="flex-1 p-6 md:p-8 space-y-6">
            
            <div className="space-y-5">
              {/* НАЗВАНИЕ */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Заголовок ролика</label>
                   <button onClick={() => handleCopy(title, 'title')} className={`text-[10px] font-bold uppercase transition-colors ${copiedField === 'title' ? 'text-green-500' : 'text-blue-500 hover:underline'}`}>
                     {copiedField === 'title' ? 'Скопировано!' : 'Копировать'}
                   </button>
                </div>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold outline-none focus:border-blue-500 transition-all" 
                />
              </div>

              {/* ОПИСАНИЕ */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Описание (Description)</label>
                   <button onClick={() => handleCopy(description, 'desc')} className={`text-[10px] font-bold uppercase transition-colors ${copiedField === 'desc' ? 'text-green-500' : 'text-blue-500 hover:underline'}`}>
                     {copiedField === 'desc' ? 'Скопировано!' : 'Копировать'}
                   </button>
                </div>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full h-40 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium leading-relaxed outline-none focus:border-blue-500 resize-none" 
                />
              </div>

              {/* ВРЕМЯ И ССЫЛКА */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Дата публикации</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 p-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-red-500 tracking-widest">Ссылка на Shorts</label>
                  <div className="relative">
                    <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={16} />
                    <input placeholder="https://..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full bg-red-50/30 dark:bg-red-950/10 p-3 pl-10 rounded-xl border border-red-200 dark:border-red-900/30 text-xs font-bold outline-none focus:border-red-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* ДЕЙСТВИЯ */}
            <div className="pt-6 border-t dark:border-slate-800">
            {isRejecting ? (
                /* БЛОК ОТКЛОНЕНИЯ */
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <textarea 
                    autoFocus 
                    placeholder="Причина доработки (что нужно исправить?)..." 
                    value={rejectionReason} 
                    onChange={(e) => setRejectionReason(e.target.value)} 
                    className="w-full p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-sm outline-none font-medium min-h-[100px]" 
                />
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                    onClick={() => setIsRejecting(false)} 
                    className="w-full h-14 flex items-center justify-center text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                    >
                    Отмена
                    </button>
                    <button 
                    onClick={onReject} 
                    className="w-full h-14 flex items-center justify-center bg-red-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                    >
                    Отклонить видео
                    </button>
                </div>
                </div>
            ) : (
                /* ОСНОВНЫЕ КНОПКИ */
                <div className="flex flex-col sm:flex-row gap-3">
                <button 
                    onClick={() => setIsRejecting(true)} 
                    className="w-full h-16 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 font-bold text-[11px] uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-800 rounded-2xl active:scale-95"
                >
                    <RotateCcw size={18}/>
                    <span>На доработку</span>
                </button>
                
                <button 
                    onClick={onPublish} 
                    className="w-full h-16 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                >
                    <Check size={20} strokeWidth={3} />
                    <span>Опубликовать</span>
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