import { useState } from 'react';
import { Link } from 'react-router-dom';
import BurgerMenu from './BurgerMenu';
import './Header.css';

function Header({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-icon">📦</span>
          <span className="logo-text">ИМЛ</span>
        </Link>

        <div className="header-right">
          {/* Кликабельный профиль */}
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