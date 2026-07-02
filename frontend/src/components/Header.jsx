import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import BurgerMenu from './BurgerMenu';
import './Header.css';

function Header({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { sse } = useAppContext();

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  // Определяем статус SSE
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

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-icon">📦</span>
          <span className="logo-text">ИМЛ</span>
        </Link>

        <div className="header-right">
          {/* Индикатор SSE */}
          <div className="sse-indicator" title={`SSE: ${statusInfo.label}`}>
            <span className={`sse-dot ${statusInfo.class}`}></span>
            <span className="sse-label">{statusInfo.label}</span>
          </div>

          <div className="user-profile" onClick={toggleMenu}>
            <span className="user-name-header">👋 {user?.name}</span>
            <span className={`role-badge ${user?.role}`}>
              {user?.role === 'admin' ? 'Админ' : 
               user?.role === 'manager' ? 'Менеджер' : 
               user?.role === 'logist' ? 'Логист' : user?.role}
            </span>
          </div>
        </div>
      </div>

      <BurgerMenu user={user} onLogout={onLogout} isOpen={menuOpen} onClose={closeMenu} />
    </header>
  );
}

export default Header;