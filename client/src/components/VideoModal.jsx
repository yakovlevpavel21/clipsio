// client/src/components/VideoModal.jsx
import { X, Film } from 'lucide-react';
import { useEffect } from 'react';

export default function VideoModal({ url, title, channel, onClose }) {
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!url) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100000] flex items-center justify-center p-4 md:p-10 overflow-hidden">
      {/* Фон с размытием */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Основной контейнер плеера */}
      <div className="relative w-full max-w-5xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
        
        {/* ВЕРХНЯЯ ИНФО-СТРОКА (Вне рамки видео для чистоты) */}
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider">
                {channel}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <Film size={12} /> Player
              </span>
            </div>
            <h2 className="text-sm md:text-base font-medium text-white truncate uppercase tracking-tight opacity-90">
              {title}
            </h2>
          </div>

          <button 
            onClick={onClose}
            className="ml-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all border border-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* РАМКА ВИДЕО 16:9 */}
        <div className="relative w-full aspect-video bg-black rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10">
          <video 
            src={url} 
            className="w-full h-full object-contain"
            controls 
            autoPlay
            playsInline // <-- Добавь это
          />
        </div>

        {/* ПОДСКАЗКА ВНИЗУ */}
        <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] opacity-50">
          Clipsio Cinema Mode
        </p>
      </div>
    </div>
  );
}