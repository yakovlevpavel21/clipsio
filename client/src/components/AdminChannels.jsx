// client/src/components/AdminChannels.jsx
import { useState } from 'react';
import { Plus, Trash2, Tv, Info } from 'lucide-react';

export default function AdminChannels({ channels, onAdd, onDelete, onUpdate }) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName);
    setNewName('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Форма добавления нового канала */}
      <div className="bg-white dark:bg-[#1a1f2e] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            value={newName} 
            onChange={e => setNewName(e.target.value)} 
            placeholder="Название нового канала..." 
            className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium outline-none focus:border-blue-500 transition-all" 
          />
          <button 
            onClick={handleAdd}
            className="h-14 px-8 bg-blue-600 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <Plus size={18}/> Добавить
          </button>
        </div>
      </div>

      {/* Список каналов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {channels.map(c => (
          <div key={c.id} className="bg-white dark:bg-[#1a1f2e] p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 group hover:border-blue-500/20 transition-all">
            
            {/* 1. Название и удаление */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Название канала</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-transparent focus:border-blue-500 dark:text-white font-bold uppercase text-sm outline-none transition-all"
                  defaultValue={c.name}
                  onBlur={(e) => onUpdate(c.id, { name: e.target.value })}
                />
              </div>
              <button 
                onClick={() => onDelete('channels', c.id)} 
                className="mt-6 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Trash2 size={20}/>
              </button>
            </div>

            {/* 2. Префикс названия */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Префикс названия (YouTube Title)</label>
              <input 
                placeholder="Напр: 🔥 ШОК! | "
                className="w-full bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-transparent focus:border-blue-500 text-xs font-semibold outline-none transition-all"
                defaultValue={c.titlePrefix}
                onBlur={(e) => onUpdate(c.id, { titlePrefix: e.target.value })}
              />
            </div>

            {/* 3. Конструктор описания */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Конструктор описания</label>
              
              <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 space-y-5 shadow-inner">
                
                {/* Переключатель ссылки */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[11px] font-bold uppercase text-slate-500 group-hover:text-blue-500 transition-colors">Ссылка на оригинал</span>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      defaultChecked={c.showOriginalLink} 
                      onChange={(e) => onUpdate(c.id, { showOriginalLink: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-all"></div>
                  </div>
                </label>
                
                {c.showOriginalLink && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Текст перед ссылкой</label>
                    <input 
                      className="w-full bg-white dark:bg-slate-800 p-2.5 text-xs rounded-lg border dark:border-slate-700 outline-none focus:border-blue-500 transition-all"
                      defaultValue={c.originalLinkPrefix}
                      onBlur={(e) => onUpdate(c.id, { originalLinkPrefix: e.target.value })}
                      placeholder="Напр: оригинал - "
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 px-2">
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                  <span className="text-[8px] font-black uppercase text-slate-300 dark:text-slate-600 tracking-widest">Авто-отступ</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Текст после ссылки (Footer)</label>
                  <textarea 
                    className="w-full bg-white dark:bg-slate-800 p-3 text-xs rounded-lg border dark:border-slate-700 outline-none resize-none h-28 focus:border-blue-500 transition-all font-medium leading-relaxed"
                    defaultValue={c.descriptionFooter}
                    onBlur={(e) => onUpdate(c.id, { descriptionFooter: e.target.value })}
                    placeholder="Email, соцсети, теги..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 text-slate-400 opacity-50">
              <Tv size={14} />
              <span className="text-[9px] font-bold uppercase tracking-tighter">System ID: {c.id}</span>
            </div>
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed dark:border-slate-800 rounded-[3rem] text-slate-500 font-bold uppercase text-xs">
          Список каналов пуст
        </div>
      )}
    </div>
  );
}