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
import { RegionalContractorsPage, NewsHub } from './pages';
import TaskModal from './components/modals/TaskModal';
import PersonalTaskModal from './components/personal-tasks/PersonalTaskModal';
import PersonalTaskFormModal from './components/personal-tasks/PersonalTaskFormModal';
import GalleryHub from './pages/GalleryHub';
import DutiesPage from './pages/DutiesPage';
import VacationsPage from './pages/VacationsPage';
import NewsFormModal from './components/news/NewsFormModal';
import ComplaintPage from './pages/ComplaintPage';
import ErrorTypesPage from './pages/ErrorTypesPage';
import ComplaintCategoriesPage from './pages/ComplaintCategoriesPage';
import ComplaintsPage from './pages/ComplaintsPage';
import StatisticsPage from './pages/StatisticsPage';
import './App.css';

function App() {
  const { user, login, logout } = useAuth();
  const location = useLocation();
  const { 
    openModal, 
    taskType, 
    isTaskFormOpen, 
    closeTaskForm, 
    taskFormCallback,
    isNewsFormOpen,
    closeNewsForm,
    newsFormCallback,
  } = useModal();

  // Обработка task_id из URL (при клике на push-уведомление)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskId = params.get('task_id');
    const taskType = params.get('type') || 'task'; // personal_task или task
    
    if (taskId) {
      // Очищаем URL от параметра
      window.history.replaceState({}, '', window.location.pathname);
      
      // Определяем API в зависимости от типа
      const apiUrl = taskType === 'personal_task' 
        ? `/api/personal-tasks/${taskId}`
        : `/api/tasks/${taskId}`;
      
      // Загружаем задачу и открываем модалку
      fetch(apiUrl)
        .then(r => r.json())
        .then(task => {
          const modalType = taskType === 'personal_task' ? 'personal_task' : (task.type || 'arrival');
          openModal(task, modalType);
        })
        .catch(err => console.error('Ошибка загрузки задачи из push:', err));
    }
  }, [location, openModal]);

  // Обработка события открытия задачи из push-уведомления (из sw.js)
  useEffect(() => {
    const handleOpenTask = async (event) => {
      const { task_id, task_type } = event.detail;
      if (task_id) {
        try {
          // Определяем API в зависимости от типа
          const apiUrl = task_type === 'personal_task' 
            ? `/api/personal-tasks/${task_id}`
            : `/api/tasks/${task_id}`;
          
          const response = await fetch(apiUrl);
          const task = await response.json();
          const modalType = task_type === 'personal_task' ? 'personal_task' : (task.type || 'arrival');
          openModal(task, modalType);
        } catch (err) {
          console.error('Ошибка открытия задачи из push:', err);
        }
      }
    };

    window.addEventListener('open-task-from-push', handleOpenTask);
    return () => window.removeEventListener('open-task-from-push', handleOpenTask);
  }, [openModal]);

  // Обработчик создания личной задачи из глобальной формы
  const handleCreatePersonalTask = async (values, files) => {
    if (!user?.name) return;
    
    try {
      const response = await fetch('/api/personal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description || '',
          author: user.name,
          assigned_to: values.assigned_to || [],
          items: values.items || [],
          files: files || [],
          due_date: values.due_date || null,
          show_only_on_day: values.show_only_on_day || false,
          priority: values.priority || 'medium',
        }),
      });
      const data = await response.json();
      if (data.success) {
        closeTaskForm();
        // Если есть callback — вызываем
        if (taskFormCallback) taskFormCallback();
      } else {
        alert(data.message || 'Ошибка при создании задачи');
      }
    } catch (err) {
      console.error('Ошибка создания задачи:', err);
      alert('Ошибка при создании задачи');
    }
  };

  const handleCreateNews = async (values) => {
    if (!user?.name) return;
    
    try {
      const response = await fetch('/api/calendar/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.success) {
        closeNewsForm();
        if (newsFormCallback) newsFormCallback();
      } else {
        alert(data.message || 'Ошибка при создании новости');
      }
    } catch (err) {
      console.error('Ошибка создания новости:', err);
      alert('Ошибка при создании новости');
    }
  };

  if (location.pathname === '/complaint') {
    return <ComplaintPage />;
  }

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
          <Route path="/news" element={<NewsHub />} />
          
          {/* Хабы */}
          <Route path="/hub/arrivals" element={<ArrivalsHub />} />
          <Route path="/hub/regions" element={<RegionsHub />} />
          <Route path="/hub/spb" element={<SpbHub />} />
          <Route path="/hub/invoices" element={<InvoicesHub />} />
          <Route path="/hub/airtraffic" element={<AirTrafficHub />} />
          <Route path="/hub/tasks" element={<TasksHub />} />
          <Route path="/hub/gallery" element={<GalleryHub />} />
          
          {/* Админка */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<UsersPage user={user} onLogout={logout} />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="regional-contractors" element={<RegionalContractorsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="/admin/duties" element={<DutiesPage user={user} />} />
            <Route path="/admin/vacations" element={<VacationsPage user={user} />} />
            <Route path="/admin/error-types" element={<ErrorTypesPage />} />
            <Route path="/admin/complaint-categories" element={<ComplaintCategoriesPage />} />
            <Route path="/admin/complaints" element={<ComplaintsPage />} />
            <Route path="/admin/statistics" element={<StatisticsPage />} />
            <Route index element={<Navigate to="/admin/users" replace />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {taskType === 'personal_task' ? <PersonalTaskModal /> : <TaskModal />}
      
      {/* Глобальная форма создания личной задачи */}
      <PersonalTaskFormModal
        isOpen={isTaskFormOpen}
        onClose={closeTaskForm}
        onSubmit={handleCreatePersonalTask}
        currentUser={user}
      />

      {/* Глобальная форма создания новости */}
      <NewsFormModal
        isOpen={isNewsFormOpen}
        onClose={closeNewsForm}
        onSubmit={handleCreateNews}
        currentUser={user}
      />
    </AppProvider>
  );
}

export default App;