import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useModal } from './contexts/ModalContext';
import {
  Login,
  Dashboard,
  UsersPage,
  RolesPage,
  SettingsPage,
  SystemPage,
  ArrivalsHub,
  RegionsHub,
  SpbHub,
  InvoicesHub,
  AirTrafficHub,
  TasksHub,
} from './pages';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { RegionalContractorsPage } from './pages';
import TaskModal from './components/modals/TaskModal';
import './App.css';

function App() {
  const { user, login, logout } = useAuth();
  const location = useLocation();
  const { openModal } = useModal();

  // Обработка task_id из URL (при клике на push-уведомление)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskId = params.get('task_id');
    
    if (taskId) {
      // Очищаем URL от параметра
      window.history.replaceState({}, '', window.location.pathname);
      
      // Загружаем задачу и открываем модалку
      fetch(`/api/tasks/${taskId}`)
        .then(r => r.json())
        .then(task => {
          const taskType = task.type || 'arrival';
          openModal(task, taskType);
        })
        .catch(err => console.error('Ошибка загрузки задачи из push:', err));
    }
  }, [location, openModal]);

  // Обработка события открытия задачи из push-уведомления (из sw.js)
  useEffect(() => {
    const handleOpenTask = async (event) => {
      const { task_id } = event.detail;
      if (task_id) {
        try {
          const response = await fetch(`/api/tasks/${task_id}`);
          const task = await response.json();
          const taskType = task.type || 'arrival';
          openModal(task, taskType);
        } catch (err) {
          console.error('Ошибка открытия задачи из push:', err);
        }
      }
    };

    window.addEventListener('open-task-from-push', handleOpenTask);
    return () => window.removeEventListener('open-task-from-push', handleOpenTask);
  }, [openModal]);

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout user={user} onLogout={logout} />}>
          {/* Главная */}
          <Route path="/" element={<Dashboard user={user} onLogout={logout} />} />

          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Хабы */}
          <Route path="/hub/arrivals" element={<ArrivalsHub />} />
          <Route path="/hub/regions" element={<RegionsHub />} />
          <Route path="/hub/spb" element={<SpbHub />} />
          <Route path="/hub/invoices" element={<InvoicesHub />} />
          <Route path="/hub/airtraffic" element={<AirTrafficHub />} />
          <Route path="/hub/tasks" element={<TasksHub />} />
          
          {/* Админка */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<UsersPage user={user} onLogout={logout} />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="regional-contractors" element={<RegionalContractorsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route index element={<Navigate to="/admin/users" replace />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <TaskModal />
    </AppProvider>
  );
}

export default App;