// client/src/App.jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ManagerPage from './pages/ManagerPage';
import CreatorPage from './pages/CreatorPage';
import UploaderPage from './pages/UploaderPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const handleLogin = (userData) => {
    setUser(userData);
    // После логина редиректим на главную
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
            {/* Любой другой путь отправляет на логин */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          /* Если пользователь залогинен */
          <Route path="/" element={<Layout onLogout={handleLogout} user={user} />}>
            <Route index element={<Dashboard />} />
            
            {/* Доступ для Менеджеров и Админов */}
            {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
              <>
                <Route path="manager" element={<ManagerPage />} />
                <Route path="uploader" element={<UploaderPage />} />
              </>
            )}

            {/* Доступ для всех (включая Креаторов) */}
            <Route path="creator" element={<CreatorPage />} />
            
            {/* Только для Админов */}
            {user.role === 'ADMIN' && (
              <Route path="admin" element={<AdminPage />} />
            )}

            {/* Редирект с /login на главную, если уже вошел */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            {/* Если забрел не туда — на главную */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}