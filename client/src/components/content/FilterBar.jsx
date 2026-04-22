import { memo } from 'react';
import { ChevronDown, Layers, Activity, Users, Plus } from 'lucide-react';

function FilterSelect({ value, onChange, options, labelKey = 'name', icon }) {
  const isActive = value !== 'all';
  
  return (
    <div className="relative group shrink-0">
      {icon && (
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors z-10 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>
          {icon}
        </div>
      )}
      
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className={`
          appearance-none outline-none cursor-pointer transition-all border font-bold text-[13px]
          py-1.5 pr-8 ${icon ? 'pl-9' : 'pl-3'} rounded-md
          ${isActive 
            ? 'bg-blue-50 dark:bg-[#252a35] border-blue-500 text-blue-600' 
            : 'bg-slate-100 dark:bg-[#2a2a2a] border-transparent text-slate-700 dark:text-[#eeeeee] hover:bg-slate-200 dark:hover:bg-[#333333]'}
        `}
      >
        {options.map(opt => (
          <option key={opt.id} value={opt.id} className="dark:bg-[#1f1f1f]">
            {opt[labelKey] || opt.name}
          </option>
        ))}
      </select>

      <ChevronDown 
        size={14} 
        className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isActive ? 'text-blue-500' : 'text-[#aaaaaa]'}`} 
      />
    </div>
  );
}

const FilterBar = ({ filters, setFilters, channels, creators, isManager, onAddTask }) => {
  return (
    <div className="sticky top-[64px] min-[1150px]:top-0 z-[60] h-[56px] flex items-center justify-between gap-4 px-4 md:px-8 bg-white dark:bg-[#1f1f1f] border-b border-slate-200 dark:border-[#333333] transition-colors">
      
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        {/* ФИЛЬТР ПО КАНАЛАМ */}
        <FilterSelect 
          icon={<Layers size={14}/>}
          value={filters.channelId} 
          onChange={(v) => setFilters(f => ({...f, channelId: v}))} 
          options={[{id: 'all', name: 'Все каналы'}, ...channels]} 
        />

        {/* ФИЛЬТР ПО СТАТУСАМ */}
        <FilterSelect 
          icon={<Activity size={14}/>}
          value={filters.status} 
          onChange={(v) => setFilters(f => ({...f, status: v}))}
          options={[
            {id: 'all', name: 'Все статусы'},
            {id: 'AWAITING_REACTION', name: 'Новые'}, // ДОБАВЛЕНО
            {id: 'IN_PROGRESS', name: 'В работе'},
            {id: 'REACTION_UPLOADED', name: 'На проверке'},
            {id: 'FIXING', name: 'Нужны правки'},
            {id: 'PUBLISHED', name: 'Опубликовано'}
          ]} 
        />

        {/* ФИЛЬТР ПО АВТОРАМ */}
        {isManager && (
          <FilterSelect 
            icon={<Users size={14}/>}
            value={filters.creatorId} 
            onChange={(v) => setFilters(f => ({...f, creatorId: v}))} 
            options={[{id: 'all', username: 'Все авторы'}, ...creators]} 
            labelKey="username" 
          />
        )}
      </div>

      {isManager && (
        <button onClick={onAddTask} className="min-[850px]:hidden p-2 bg-blue-600 text-white rounded-lg shrink-0">
          <Plus size={20} />
        </button>
      )}
    </div>
  );
};

export default memo(FilterBar);