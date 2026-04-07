// client/src/components/UploadModal.jsx
import { useState, useEffect } from 'react';
import { X, UploadCloud, Loader2, Check, RefreshCcw, Film, PlayCircle } from 'lucide-react';
import axios from 'axios';

export default function UploadModal({ task, onClose, onSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Ссылка на оригинальный файл на сервере
  const originalVideoUrl = `/${task.originalVideo?.filePath}`;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return alert("Нужен видеофайл!");
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
  };

  const handleFinalUpload = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('video', selectedFile);
    
    try {
      const res = await axios.post(`/api/tasks/${task.id}/upload`, formData);
      
      if (res.data.tgWarning) {
        alert(`⚠️ ${res.data.tgWarning}`);
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Ошибка при загрузке файла");
      setLoading(false);
    }
  };

  const resetSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />
      
      <div className="relative bg-white dark:bg-[#1a1f2e] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Кнопка закрытия */}
        <button 
          onClick={onClose} 
          disabled={loading} 
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all z-[100] bg-white/10 backdrop-blur-md border border-white/10"
        >
          <X size={20} />
        </button>
        
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto no-scrollbar">
          
          {/* СЕКЦИЯ: ОРИГИНАЛЬНОЕ ВИДЕО (ПЛЕЕР) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pr-10">
               <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                 <Film size={14} /> Оригинал
               </div>
               <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                 {task.channel?.name}
               </span>
            </div>

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-100 dark:border-slate-800 shadow-md">
              <video 
                src={originalVideoUrl} 
                className="w-full h-full object-contain" 
                controls
                preload="metadata"
                playsInline
              />
            </div>
            <p className="text-[11px] font-medium text-slate-500 px-1 truncate">
              {task.originalVideo.title}
            </p>
          </div>

          {/* СЕКЦИЯ: ЗАГРУЗКА ОТВЕТА */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {previewUrl ? "Проверьте ваш результат" : "Загрузите вашу реакцию"}
            </div>

            {!previewUrl ? (
              <label 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]); }}
                className={`
                  relative h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer
                  ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/30'}
                `}
              >
                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Выберите файл реакции</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Перетащите сюда MP4 / MOV</p>
                  </div>
                </div>
              </label>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-blue-500/20 shadow-xl">
                  <video 
                    src={previewUrl} 
                    controls 
                    className="w-full h-full object-contain"
                    playsInline
                  />
                </div>

                {loading ? (
                  <div className="flex flex-col items-center py-2 gap-2">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Отправка в Clipsio...</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={resetSelection}
                      className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCcw size={14} /> Отмена
                    </button>
                    <button 
                      onClick={handleFinalUpload}
                      className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      <Check size={16} /> Сохранить и отправить
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}