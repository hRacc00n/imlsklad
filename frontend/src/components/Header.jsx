import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { getRoleLabel } from '../utils/roleUtils';
import BurgerMenu from './BurgerMenu';
import './Header.css';
import NotificationsBell from './common/NotificationsBell';
import axios from 'axios';

function Header({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { sse } = useAppContext();
  const [roles, setRoles] = useState([]);

  // Загружаем роли при монтировании
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await axios.get('/api/roles');
        setRoles(response.data);
      } catch (err) {
        console.error('Ошибка загрузки ролей:', err);
      }
    };
    loadRoles();
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const getStatusInfo = () => {
    switch (sse.status) {
      case 'connected':
        return { label: '🟢 Онлайн', class: 'sse-online' };
      case 'connecting':
        return { label: '🟡 Подключение...', class: 'sse-connecting' };
      case 'error':
        return { label: '🔴 Ошибка', class: 'sse-error' };
      default:
        return { label: '⚫ Офлайн', class: 'sse-offline' };
    }
  };

  const statusInfo = getStatusInfo();
  const roleLabel = getRoleLabel(user?.role, roles);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-icon">📦</span>
          <span className="logo-text">ИМЛ</span>
        </Link>

        <div className="header-right">
          <div className="sse-indicator" title={`SSE: ${statusInfo.label}`}>
            <span className={`sse-dot ${statusInfo.class}`}></span>
            <span className="sse-label">{statusInfo.label}</span>
          </div>

          <NotificationsBell userName={user?.name} />

          <div className="user-profile" onClick={toggleMenu}>
            <span className="user-name-header">👋 {user?.name}</span>
            <span className={`role-badge ${user?.role}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <BurgerMenu 
        user={user} 
        onLogout={onLogout} 
        isOpen={menuOpen} 
        onClose={closeMenu} 
        roles={roles} 
      />
    </header>
  );
}

export default Header;