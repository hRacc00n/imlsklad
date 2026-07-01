import { Link } from 'react-router-dom';
import './Header.css';

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">📦</span>
          <span className="logo-text">ИМЛ</span>
        </Link>

        <div className="header-right">
          <div className="user-info">
            <span className="user-name">👋 {user?.name}</span>
            <span className={`role-badge ${user?.role}`}>
              {user?.role === 'admin' ? 'Админ' : 
               user?.role === 'manager' ? 'Менеджер' : 
               user?.role === 'logist' ? 'Логист' : user?.role}
            </span>
          </div>
          <button onClick={onLogout} className="logout-btn">Выйти</button>
        </div>
      </div>
    </header>
  );
}

export default Header;