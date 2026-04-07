// client/src/components/AdminSettings.jsx
import { Globe, Send, Key, Info, Loader2, X, CheckCircle2, Save, RefreshCw } from 'lucide-react';

export default function AdminSettings({ 
  proxy, 
  setProxy, 
  onSaveProxy, 
  settings, 
  tgStatus, 
  onCheckTg, 
  onStartPairing, 
  isStartingBot, 
  onResetTg, 
  onSendTest 
}) {
  const isTgConnected = settings.find(s => s.key === 'tg_group_id');

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* --- БЛОК: PROXY & NETWORK --- */}
      <div className="p-6 md:p-8 bg-white dark:bg-[#1a1f2e] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 text-blue-600">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
            <Globe size={22}/>
          </div>
          <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white">Сеть и Proxy</h3>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed font-medium">
          Настройте прокси для обхода ограничений YouTube. Параметры будут использоваться для получения метаданных и скачивания роликов.
        </p>

        <div className="space-y-4">
          <input 
            value={proxy} 
            onChange={e => setProxy(e.target.value)} 
            placeholder="http://user:pass@host:port" 
            className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono outline-none focus:border-blue-500 transition-all shadow-inner" 
          />
          <button 
            onClick={onSaveProxy} 
            className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase text-xs tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
          >
            <Save size={18}/> Сохранить конфигурацию
          </button>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl flex gap-3 items-start border border-blue-100 dark:border-blue-900/30">
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
            Поддерживаются HTTP и SOCKS5 прокси. Формат: <code className="bg-white/50 dark:bg-black/20 px-1 rounded">http://ip:port</code>.
          </p>
        </div>
      </div>

      {/* --- БЛОК: TELEGRAM NOTIFICATIONS --- */}
      <div className="p-6 md:p-8 bg-white dark:bg-[#1a1f2e] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-blue-500">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Send size={20} />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white">Уведомления Telegram</h3>
          </div>
          
          {isTgConnected ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full text-[10px] font-bold uppercase border border-emerald-100 dark:border-emerald-800">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Подключено
            </span>
          ) : (
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold uppercase">
              Не настроено
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 leading-relaxed font-medium">
          Автоматическая рассылка задач и статусов выполнения в выбранную группу.
        </p>

        {/* Статус сопряжения / Привязка */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          {isTgConnected ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ID Рабочего чата</p>
                <code className="text-blue-500 font-mono text-sm">{isTgConnected.value}</code>
              </div>
              <button 
                onClick={onResetTg}
                className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase hover:underline"
              >
                <X size={14} /> Отвязать группу
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Связь с группой</p>
                <button 
                  onClick={onStartPairing}
                  disabled={isStartingBot || tgStatus.data?.isPairing}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${
                    tgStatus.data?.isPairing 
                      ? 'bg-amber-100 text-amber-600 border border-amber-200' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                  } disabled:opacity-70`}
                >
                  {isStartingBot ? <><Loader2 className="animate-spin" size={14} /> Запуск...</> : 
                   tgStatus.data?.isPairing ? <><div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" /> Бот ищет группу...</> : 
                   'Привязать группу'}
                </button>
              </div>
              {!tgStatus.data?.isPairing && (
                <div className="space-y-2 opacity-60">
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                     Нажмите кнопку выше и добавьте бота в группу. Он сам определит чат и завершит настройку.
                   </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Проверка работоспособности */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${tgStatus.data?.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[11px] font-bold dark:text-white uppercase tracking-wider">Статус API Telegram</span>
            </div>
            <button onClick={onCheckTg} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          {tgStatus.data?.online && (
            <div className="space-y-3 animate-in fade-in">
              <p className="text-xs text-slate-500 font-medium">Бот <b>@{tgStatus.data.botName}</b> готов к работе.</p>
              {isTgConnected && (
                <button onClick={onSendTest} className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-all">
                  <CheckCircle2 size={12} /> Отправить тест в чат
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}