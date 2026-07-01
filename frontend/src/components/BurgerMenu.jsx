import { Link } from 'react-router-dom';
import './BurgerMenu.css';

function BurgerMenu({ user, onLogout, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="burger-overlay" onClick={onClose}>
      <div className="burger-menu" onClick={e => e.stopPropagation()}>
        <div className="burger-menu-header">
          <span className="burger-user-name">{user?.name}</span>
          <span className={`burger-role-badge ${user?.role}`}>
            {user?.role === 'admin' ? 'Админ' : 
             user?.role === 'manager' ? 'Менеджер' : 
             user?.role === 'logist' ? 'Логист' : user?.role}
          </span>
        </div>

        <div className="burger-nav">
          {user?.role === 'admin' && (
            <>
              <Link to="/admin" className="burger-link" onClick={onClose}>
                ⚙️ Админ панель
              </Link>
              <div className="burger-divider"></div>
            </>
          )}
          <Link to="/" className="burger-link" onClick={onClose}>
            🏠 Главная
          </Link>
          <button className="burger-logout-btn" onClick={() => { onClose(); onLogout(); }}>
            🚪 Выйти
          </button>
        </div>
      </div>
    </div>
  );
}

export default BurgerMenu;