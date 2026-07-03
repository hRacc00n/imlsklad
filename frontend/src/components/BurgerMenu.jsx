import { Link } from 'react-router-dom';
import { getRoleLabel } from '../utils/roleUtils';
import './BurgerMenu.css';

function BurgerMenu({ user, onLogout, isOpen, onClose, roles = [] }) {
  if (!isOpen) return null;

  const roleLabel = getRoleLabel(user?.role, roles);

  return (
    <div className="burger-overlay" onClick={onClose}>
      <div className="burger-menu" onClick={e => e.stopPropagation()}>
        <div className="burger-menu-header">
          <span className="burger-user-name">{user?.name}</span>
          <span className={`burger-role-badge ${user?.role}`}>
            {roleLabel}
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