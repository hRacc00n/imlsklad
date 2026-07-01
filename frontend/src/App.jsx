import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return <Login onLogin={login} />;
  }

  return <Dashboard user={user} onLogout={logout} />;
}

export default App;