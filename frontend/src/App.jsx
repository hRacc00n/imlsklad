import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import SystemPage from './pages/SystemPage';
import ArrivalsHub from './pages/ArrivalsHub';
import TaskModal from './components/modals/TaskModal';
import './App.css';

function App() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return <Login onLogin={login} />;
  }

  // Убрали проверку на роль - теперь все пользователи имеют доступ ко всем маршрутам
  return (
    <>
      <Routes>
        <Route element={<Layout user={user} onLogout={logout} />}>
          <Route path="/" element={<Dashboard user={user} onLogout={logout} />} />
          <Route path="/hub/arrivals" element={<ArrivalsHub />} />
          
          {/* Админские маршруты теперь доступны всем */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<UsersPage user={user} onLogout={logout} />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route index element={<Navigate to="/admin/users" replace />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <TaskModal />
    </>
  );
}

export default App;