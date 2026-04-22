import { memo, useState, useEffect } from 'react';
import {
  Play, Download, MoreVertical, PlayCircle, ExternalLink,
  Trash2, Edit3, Send, Clock, UploadCloud, User as UserIcon
} from 'lucide-react';
import api from '../../api';
import { StatusBadge, DateInfo, VideoThumbnail } from './Helpers';
import { Link } from 'react-router-dom';

const DesktopTable = ({
  tasks, user, isManager, isAdmin, highlightedId, lastElementRef,
  setUploadTarget, setEditTarget, setPublishTarget, setActivePreview,
  loadData, handleDownload, activeDropdownId, setActiveDropdownId,
  setHistoryTarget
}) => {

  const formatDuration = (s) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="bg-slate-50 dark:bg-[#232323]">
            {[
              { label: 'Видео', width: 'w-[45%]', align: 'text-left pl-8' },
              ...(isManager ? [{ label: 'Автор', width: 'w-[15%]', align: 'text-center' }] : []),
              { label: 'Канал', width: 'w-[12%]', align: 'text-center' },
              { label: 'Статус', width: 'w-[13%]', align: 'text-center' },
              { label: 'Дата', width: 'w-[15%]', align: 'text-right pr-8' }
            ].map((col, i) => (
              <th
                key={i}
                className={`
                  sticky z-50 p-4 font-bold text-[10px] uppercase tracking-widest
                  text-slate-400 dark:text-[#aaaaaa]
                  bg-slate-50 dark:bg-[#232323] 
                  border-b-2 border-slate-200 dark:border-[#333333]
                  /* 120px на мобиле (хедер+фильтры), 56px на ПК (только фильтры) */
                  top-[120px] min-[1150px]:top-[56px]
                  ${col.align} ${col.width}
                `}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#333333]">
          {tasks.map((task, index) => {
            const isPub = task.status === 'PUBLISHED';
            const hasOriginal = task.originalFileExists; 
            const hasReaction = task.reactionFileExists;
            const isReady = task.status === 'REACTION_UPLOADED' || isPub;
            const isMyManagedTask = isAdmin || (user.role === 'MANAGER' && task.managerId === user.id);
            const isLastItems = index >= tasks.length - 3 && tasks.length > 5;
            const isNewTask = task.status === 'AWAITING_REACTION' && task.creatorId === user.id;

            // 1. ЛОГИКА ГЛАВНОЙ КНОПКИ (140px)
            let primaryBtn = null;
            if (isNewTask) {
              primaryBtn = (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    api.post(`/api/tasks/${task.id}/claim`).then(() => handleDownload(task, 'original'));
                  }} 
                  className="w-full h-8 flex items-center justify-center gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase transition-all shadow-lg"
                >
                  <Download size={14} /> <span>Начать работу</span>
                </button>
              );
            } else if (isPub) {
              primaryBtn = (
                <button onClick={() => window.open(task.youtubeUrl, '_blank')} className="w-full h-8 flex items-center justify-center gap-1.5 px-3 border border-slate-200 dark:border-[#444444] hover:bg-slate-100 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f1f1f1] rounded text-[10px] font-black uppercase transition-all">
                  <PlayCircle size={14} className="text-emerald-500" /> <span>РЕЗУЛЬТАТ</span>
                </button>
              );
            } else if (isMyManagedTask) {
              // Если Менеджер/Админ - кнопка ВЫЛОЖИТЬ или ИЗМЕНИТЬ
              if (isReady) {
                primaryBtn = (
                  <button onClick={() => setPublishTarget(task)} className="w-full h-8 flex items-center justify-center gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase transition-all shadow-sm">
                    <Send size={14} /> <span>ВЫЛОЖИТЬ</span>
                  </button>
                );
              } else {
                primaryBtn = (
                  <button onClick={() => setEditTarget(task)} className="w-full h-8 flex items-center justify-center gap-1.5 px-3 border border-slate-200 dark:border-[#444444] hover:bg-slate-100 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f1f1f1] rounded text-[10px] font-black uppercase transition-all">
                    <Edit3 size={14} className="text-amber-500" /> <span>ИЗМЕНИТЬ</span>
                  </button>
                );
              }
            } else {
              // Если Креатор - кнопка СДАТЬ/ЗАМЕНИТЬ
              primaryBtn = (
                <button onClick={() => setUploadTarget(task)} className="w-full h-8 flex items-center justify-center gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase transition-all shadow-sm">
                  <UploadCloud size={14} /> <span>{isReady || task.needsFixing ? 'ЗАМЕНИТЬ' : 'СДАТЬ'}</span>
                </button>
              );
            }

            // 2. ЛОГИКА ВЫПАДАЮЩЕГО МЕНЮ
            const actions = [
              // ГРУППА 1: ОРИГИНАЛЬНЫЙ РОЛИК
              { 
                id: 'p_orig', label: 'Воспроизвести оригинал', icon: <Play size={16}/>, 
                disabled: !hasOriginal,
                onClick: () => setActivePreview({ url: `/${task.originalVideo.filePath}`, title: task.originalVideo.title, channel: task.channel.name }) 
              },
              { 
                id: 'yt_orig', label: 'Оригинал на YouTube', icon: <ExternalLink size={16}/>, 
                onClick: () => window.open(task.originalVideo.url, '_blank') 
              },
              { 
                id: 'dl_orig', label: 'Скачать оригинал', icon: <Download size={16}/>, 
                disabled: !hasOriginal, 
                onClick: () => handleDownload(task, 'original') 
              },

              { type: 'divider' }, // РАЗДЕЛИТЕЛЬ

              // ГРУППА 2: РЕЗУЛЬТАТ (РЕАКЦИЯ)
              { 
                id: 'p_react', label: 'Воспроизвести результат', icon: <Play size={16} />, 
                disabled: !hasReaction,
                onClick: () => setActivePreview({ url: `/${task.reactionFilePath}`, title: task.originalVideo.title, channel: task.channel.name }) 
              },
              { 
                id: 'yt_res', label: 'Результат на YouTube', icon: <ExternalLink size={16} />, 
                disabled: !isPub || !task.youtubeUrl,
                onClick: () => window.open(task.youtubeUrl, '_blank') 
              },
              { 
                id: 'dl_react', label: 'Скачать результат', icon: <Download size={16} />, 
                disabled: !hasReaction, 
                onClick: () => handleDownload(task, 'reaction') 
              },

              { type: 'divider' }, // РАЗДЕЛИТЕЛЬ

              { 
                id: 'history', 
                label: 'История событий', 
                icon: <Clock size={16}/>, 
                onClick: () => setHistoryTarget(task) 
              },
            ];

            // ГРУППА 3: УПРАВЛЕНИЕ (только для менеджеров)
            if (isMyManagedTask) {
                actions.push({ type: 'divider' });
                if (!isPub) {
                  actions.push({ id: 'edit', label: 'Настройки задачи', icon: <Edit3 size={16} />, onClick: () => setEditTarget(task) });
                }
                actions.push({ id: 'del', label: 'Удалить задачу', icon: <Trash2 size={16} className="text-red-500" />, color: 'text-red-500', onClick: () => { if(confirm("Удалить?")) api.delete(`/api/tasks/${task.id}`).then(() => loadData(0, true)) } });
            }

            return (
              <tr 
                key={task.id} 
                id={`task-${task.id}`} // ID должен быть строго на теге <tr>
                className={`
                  transition-all duration-500
                  ${task.id === highlightedId 
                    ? 'bg-blue-500/20 ring-2 ring-inset ring-blue-500/50 shadow-lg' // Усилили для ПК
                    : 'hover:bg-slate-50/80 dark:hover:bg-[#2a2a2a]'
                  }
                `}
              >
                <td className="p-4 pl-8">
                  <div className="flex items-start gap-5">
                    <div className="relative group cursor-pointer" onClick={() => setActivePreview({ 
                          url: `/${isPub || isReady ? task.reactionFilePath : task.originalVideo.filePath}`, 
                          title: task.originalVideo.title,
                          channel: task.channel.name 
                        })}>
                        
                      <VideoThumbnail 
                        src={task.originalVideo.thumbnailPath} 
                        duration={task.originalVideo.duration}
                        className="w-40 h-24 rounded-lg border border-slate-200 dark:border-[#333333]"
                      />
                      
                      {/* Иконка Play при наведении */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={24} fill="white" className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <h4 className="text-[14px] font-medium leading-snug line-clamp-2 mb-4 text-slate-900 dark:text-white">
                        {task.originalVideo.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="w-[140px] shrink-0">{primaryBtn}</div>
                        <div className="relative">
                          <button 
                            // ДОБАВЛЕН КЛАСС: dots-menu-button
                            className={`dots-menu-button p-1.5 rounded-md transition-all ${
                              activeDropdownId === task.id 
                                ? 'bg-slate-200 dark:bg-[#333333] text-blue-600 dark:text-white' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                            }`}
                            onClick={(e) => { 
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === task.id ? null : task.id); 
                            }}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeDropdownId === task.id && (
                            <div className={`absolute left-0 w-64 bg-white dark:bg-[#282828] border border-slate-200 dark:border-[#333333] rounded-md shadow-2xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-75 ${isLastItems ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                              {actions.map((act, i) => {
                                if (act.type === 'divider') {
                                  return <div key={`div-${i}`} className="h-px bg-slate-100 dark:bg-[#333333] my-1 mx-2" />;
                                }
                                return (
                                  <button 
                                    key={act.id} 
                                    disabled={act.disabled}
                                    onClick={(e) => { e.stopPropagation(); act.onClick(); }} 
                                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-[#333333] text-[13px] font-medium transition-colors 
                                      ${act.disabled ? 'opacity-30 cursor-not-allowed' : (act.color || 'text-slate-700 dark:text-[#eeeeee]')}`}
                                  >
                                    <span className="opacity-70">{act.icon}</span> 
                                    <span>{act.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                {isManager && (
                  <td className="p-4 text-center">
                    {/* Чистая ссылка без фонов и рамок */}
                    <Link
                      to={`/profile/${task.creatorId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 transition-colors group/author text-slate-500 dark:text-[#eeeeee] hover:text-blue-500"
                    >
                      {/* Минималистичный аватар */}
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold group-hover/author:bg-blue-500 group-hover/author:text-white transition-all">
                        {task.creator?.username?.slice(0, 1).toUpperCase() || '?'}
                      </div>
                      <span className="text-[13px] font-medium transition-colors">
                        {task.creator?.username || '---'}
                      </span>
                    </Link>
                  </td>
                )}
                <td className="p-4 text-center">
                  <span className="text-[13px] font-medium text-slate-500 dark:text-[#eeeeee]">
                    {task.channel.name}
                  </span>
                </td>
                <td className="p-4 text-center overflow-visible">
                  <div className="flex justify-center items-center w-full px-1 overflow-visible">
                    <StatusBadge task={task} />
                  </div>
                </td>
                <td className="p-4 pr-8 text-right overflow-visible">
                  <DateInfo task={task} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default memo(DesktopTable);