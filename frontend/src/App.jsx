import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
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
import TaskModal from './components/modals/TaskModal';
import './App.css';

function App() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout user={user} onLogout={logout} />}>
          {/* Главная */}
          <Route path="/" element={<Dashboard user={user} onLogout={logout} />} />
          
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