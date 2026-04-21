import { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, ExternalLink, Edit3, Trash2, Clock, PlayCircle } from 'lucide-react';
import api from '../../api';

const BottomSheet = ({ task, isManager, onClose, setActivePreview, setEditTarget, loadData, handleDownload, setHistoryTarget }) => {
  const isPublished = task.status === 'PUBLISHED';
  const hasOriginal = !!task.originalFileExists;
  const hasReaction = !!task.reactionFileExists;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[1000] bg-black/60 pointer-events-auto" />
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.6}
        onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose(); }}
        className="fixed inset-x-0 bottom-0 z-[1001] p-2 pb-8 pointer-events-none flex justify-center"
      >
        <div className="w-full max-w-sm bg-white dark:bg-[#1c1c1c] rounded-[1.5rem] p-2 pt-1 pointer-events-auto shadow-2xl border border-slate-100 dark:border-[#333333]">
          
          <div className="w-full py-3 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1.5 bg-slate-200 dark:bg-[#444444] rounded-full mx-auto" />
          </div>
          
          <div className="flex flex-col gap-0.5">
            {/* ГРУППА: ОРИГИНАЛ */}
            <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50">Оригинал</div>
            <MobileMenuBtn 
              disabled={!hasOriginal}
              icon={<Play size={18}/>} label="Воспроизвести оригинал" 
              onClick={() => { setActivePreview({ url: `/${task.originalVideo.filePath}`, title: task.originalVideo.title, channel: task.channel.name }); onClose(); }} 
            />
            <MobileMenuBtn 
              icon={<ExternalLink size={18}/>} label="Смотреть на YouTube" 
              onClick={() => { window.open(task.originalVideo.url, '_blank'); onClose(); }} 
            />
            <MobileMenuBtn 
              disabled={!hasOriginal}
              icon={<Download size={18}/>} label="Скачать файл" 
              onClick={() => { handleDownload(task, 'original'); onClose(); }} 
            />

            <div className="h-px bg-slate-100 dark:bg-[#333333] my-2 mx-2" />

            {/* ГРУППА: РЕЗУЛЬТАТ */}
            <div className="px-4 py-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest opacity-50">Результат</div>
            <MobileMenuBtn 
              disabled={!hasReaction}
              icon={<Play size={18} />} label="Воспроизвести результат" 
              onClick={() => { setActivePreview({ url: `/${task.reactionFilePath}`, title: task.originalVideo.title, channel: task.channel.name }); onClose(); }} 
            />
            <MobileMenuBtn 
              disabled={!isPublished || !task.youtubeUrl}
              icon={<ExternalLink size={18} />} label="Смотреть на YouTube" 
              onClick={() => { window.open(task.youtubeUrl, '_blank'); onClose(); }} 
            />
            <MobileMenuBtn 
              disabled={!hasReaction}
              icon={<Download size={18}/>} label="Скачать файл" 
              onClick={() => { handleDownload(task, 'reaction'); onClose(); }} 
            />

            <div className="h-px bg-slate-100 dark:bg-[#333333] my-2 mx-2" />
            
            <MobileMenuBtn 
              icon={<Clock size={18}/>} 
              label="История событий" 
              onClick={() => { setHistoryTarget(task); onClose(); }} 
            />

            {isManager && (
              <>
                <div className="h-px bg-slate-100 dark:bg-[#333333] my-2 mx-2" />
                {!isPublished && (
                  <MobileMenuBtn 
                    icon={<Edit3 size={18}/>} label="Изменить задачу" 
                    onClick={() => { setEditTarget(task); onClose(); }} 
                  />
                )}
                <MobileMenuBtn 
                  icon={<Trash2 size={18} className="text-red-500" />} 
                  label="Удалить навсегда" color="text-red-500" 
                  onClick={() => { if(confirm("Удалить?")) { api.delete(`/api/tasks/${task.id}`).then(() => { loadData(0, true); onClose(); }); } }} 
                />
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

function MobileMenuBtn({ icon, label, onClick, color = "text-slate-900 dark:text-[#eeeeee]", disabled }) {
  return (
    <button 
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      className={`w-full flex items-center gap-4 py-2.5 px-4 active:bg-slate-100 dark:active:bg-[#2a2a2a] transition-colors rounded-xl ${color} disabled:opacity-20`}
    >
      <div className="opacity-70">{icon}</div>
      <span className="text-[14px] font-medium tracking-tight">{label}</span>
    </button>
  );
}

export default memo(BottomSheet);