import { useState, useEffect } from 'react'; // Добавь импорт хуков
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ManagerPage from './pages/ManagerPage';
import CreatorPage from './pages/CreatorPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import api, { socket } from './api'; // Импортируем наш настроенный сокет

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  // ЭТОТ БЛОК ДОЛЖЕН БЫТЬ ВНУТРИ App
  useEffect(() => {
    if (user && socket) {
      // Если сокет уже подключен, шлем сразу
      if (socket.connected) {
        socket.emit('user_online', user.id);
      }
      
      // На случай переподключения (интернет моргнул)
      socket.on('connect', () => {
        socket.emit('user_online', user.id);
      });

      return () => {
        socket.off('connect');
      };
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    // window.location.href используется для полной перезагрузки, 
    // чтобы сбросить все стейты после входа
    window.location.href = '/';
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Если пользователь НЕ залогинен */}
        {!user ? (
          <>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          /* Если пользователь залогинен */
          <Route path="/" element={<Layout onLogout={handleLogout} user={user} />}>
            <Route index element={<Dashboard />} />
            
            {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
              <>
                <Route path="manager" element={<ManagerPage />} />
              </>
            )}

            <Route path="creator" element={<CreatorPage />} />
            
            {user.role === 'ADMIN' && (
              <Route path="admin" element={<AdminPage />} />
            )}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}