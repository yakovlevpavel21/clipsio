import { memo } from 'react';
import { MoreVertical, User, Play, MoreHorizontal, Download } from 'lucide-react';
import { DateInfo, StatusIcon, VideoThumbnail } from './Helpers';
import { Link } from 'react-router-dom';
import api from '../../api';

const MobileList = ({ 
  tasks, 
  user, 
  isManager, 
  highlightedId, 
  setUploadTarget, 
  setEditTarget, 
  setPublishTarget, 
  setBottomSheetTask, 
  setActivePreview, 
  handleDownload, 
  lastElementRef 
}) => {
  
  const handleRowClick = (task) => {
    // 1. Если задача новая (не принята), клик по карточке ничего не делает (нужно нажать "Начать")
    if (task.status === 'AWAITING_REACTION' && task.creatorId === user?.id) return;

    if (task.status === 'PUBLISHED') {
      setActivePreview({ 
        url: `/${task.reactionFilePath}`, 
        title: task.originalVideo.title,
        channel: task.channel.name
      });
    } else if (isManager) {
      if (task.status === 'REACTION_UPLOADED') {
        setPublishTarget(task);
      } else {
        setEditTarget(task);
      }
    } else {
      // 2. ВОЗВРАЩЕНО: Если креатор нажимает на свою активную задачу (в работе/на проверке/правки)
      if (task.creatorId === user?.id) {
        setUploadTarget(task);
      }
    }
  };

  return (
    <div className="min-[850px]:hidden divide-y divide-slate-100 dark:divide-[#333333]">
      {tasks.map((task, index) => {
        const isNewForMe = task.status === 'AWAITING_REACTION' && task.creatorId === user?.id;

        return (
          <div 
            key={task.id} 
            id={`task-${task.id}`} // ID на самом верхнем контейнере карточки
            className={`
              p-4 flex flex-col transition-all duration-500 border-l-4
              ${task.id === highlightedId 
                ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/20 z-10 scale-[1.02]' // Сделали чуть крупнее при подсветке
                : isNewForMe 
                  ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-500' 
                  : 'bg-transparent border-transparent'
              }
            `}
          >
            <div className="flex gap-4 w-full relative">
              {/* ПРЕВЬЮ - теперь тоже кликабельно */}
              <div className="shrink-0" onClick={() => handleRowClick(task)}>
                <VideoThumbnail 
                  src={task.originalVideo.thumbnailPath} 
                  duration={task.originalVideo.duration}
                  className="w-40 h-[90px] rounded-xl shadow-sm"
                />
              </div>

              {/* КОНТЕНТНАЯ ЧАСТЬ */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5" onClick={() => handleRowClick(task)}>
                <div className="pr-6">
                  <h4 className="text-[15px] font-semibold leading-tight line-clamp-2 text-slate-900 dark:text-white mb-1">
                    {task.originalVideo.title}
                  </h4>

                  <div className="flex items-center gap-2 text-[13px]">
                      <StatusIcon task={task} size={16} />
                      <span className="font-medium text-slate-600 dark:text-[#eeeeee]">
                        {task.channel.name}
                      </span>
                      
                      {isManager && task.creator && (
                        <>
                          <span className="text-slate-300 dark:text-[#444444] text-[10px]">●</span>
                          <Link 
                            to={`/profile/${task.creatorId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 truncate text-slate-500 dark:text-[#cccccc] active:text-blue-500 transition-colors"
                          >
                            <User size={13} className="shrink-0 opacity-60" />
                            <span className="truncate max-w-[70px] font-medium">{task.creator.username}</span>
                          </Link>
                        </>
                      )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                    {isNewForMe ? (
                      /* КНОПКА "НАЧАТЬ" */
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          api.post(`/api/tasks/${task.id}/claim`).then(() => handleDownload(task, 'original'));
                        }}
                        className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 active:bg-indigo-700 text-white rounded-full font-bold text-[12px] uppercase tracking-wide shadow-md transition-all active:scale-95"
                      >
                        <Download size={12} />
                        <span>Начать работу</span>
                      </button>
                    ) : (
                      /* ДАТА ИЛИ ПРАВКИ */
                      <div className="min-w-0">
                          {task.needsFixing ? (
                            <div className="text-red-500 font-semibold italic text-[13px] leading-tight truncate">
                              Правки: {task.rejectionReason}
                            </div>
                          ) : (
                            <DateInfo task={task} />
                          )}
                      </div>
                    )}
                </div>
              </div>

              {/* Кнопка три точки */}
              <button 
                onClick={(e) => { e.stopPropagation(); setBottomSheetTask(task); }} 
                className="absolute top-0 right-[-10px] p-2 text-slate-400 active:text-blue-500"
              >
                <MoreVertical size={20}/>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(MobileList);