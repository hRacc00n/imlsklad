import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import Layout from './components/Layout';
import './App.css';

function App() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return <Login onLogin={login} />;
  }

  // Если пользователь не админ — только главная
  if (user.role !== 'admin') {
    return (
      <Routes>
        <Route element={<Layout user={user} onLogout={logout} />}>
          <Route path="/" element={<Dashboard user={user} onLogout={logout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // Админ — все маршруты
  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={logout} />}>
        <Route path="/" element={<Dashboard user={user} onLogout={logout} />} />
        <Route path="/admin/users" element={<UsersPage user={user} onLogout={logout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;