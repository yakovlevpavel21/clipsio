// client/src/components/Layout.jsx
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Video, Upload, Settings, 
  Menu, X, Sun, Moon, LogOut, Zap, User 
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Layout({ onLogout, user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Определяем, какие пункты меню показывать на основе роли
  const menuItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Дашборд", roles: ['ADMIN', 'MANAGER', 'CREATOR'] },
    { to: "/manager", icon: <Settings size={20} />, label: "Менеджер", roles: ['ADMIN', 'MANAGER'] },
    { to: "/creator", icon: <Video size={20} />, label: "Креатор", roles: ['ADMIN', 'MANAGER', 'CREATOR'] },
    { to: "/admin", icon: <Zap size={20} />, label: "Админ", roles: ['ADMIN'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col lg:flex-row font-['Inter']">
      
      {/* --- MOBILE HEADER --- */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[64px] flex items-center justify-between p-4 bg-white/90 dark:bg-[#1a1f2e]/90 backdrop-blur-md border-b dark:border-slate-800 z-[100]">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={16} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-lg font-bold tracking-tight uppercase">Clipsio</h1>
        </div>
        <div className="w-10"></div> 
      </header>

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-[60] w-72 h-screen 
        bg-white dark:bg-[#1a1f2e] border-r border-slate-200 dark:border-slate-800 
        transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        <div className="p-6 flex flex-col h-full w-full">
          
          {/* Logo Section */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Zap size={22} className="text-white" fill="currentColor" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">Clipsio</h1>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="lg:hidden p-2 text-slate-400"><X size={24} /></button>
          </div>
          
          {/* User Info Card */}
          <div className="mb-8 p-4 bg-slate-50 dark:bg-[#0a0f1c] rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.username}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 no-scrollbar">
            {filteredMenu.map((item) => (
              <Link 
                key={item.to}
                to={item.to} 
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 ${
                  location.pathname === item.to 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto pt-6 space-y-2 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400 font-semibold text-sm"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span>{theme === 'dark' ? 'Светлая тема' : 'Темная тема'}</span>
            </button>

            {/* КНОПКА ВЫХОДА */}
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition text-slate-500 dark:text-slate-400 hover:text-red-600 font-semibold text-sm"
            >
              <LogOut size={20} />
              <span>Выйти из аккаунта</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pt-[64px] lg:pt-0"> 
        <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[55] lg:hidden animate-in fade-in duration-300" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}