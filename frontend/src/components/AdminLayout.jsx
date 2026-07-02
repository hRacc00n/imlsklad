import { Outlet, NavLink } from 'react-router-dom';
import './AdminLayout.css';

function AdminLayout() {
  return (
    <div className="admin-layout-wrapper">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <span className="admin-sidebar-icon">⚙️</span>
            <span className="admin-sidebar-title">Админ панель</span>
          </div>

          <nav className="admin-sidebar-nav">
            <NavLink 
              to="/admin/users" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
            >
              <span className="nav-icon">👥</span>
              Пользователи
            </NavLink>
            <NavLink 
              to="/admin/roles" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
            >
              <span className="nav-icon">🔑</span>
              Роли
            </NavLink>
            <NavLink 
              to="/admin/system" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
            >
              <span className="nav-icon">🖥️</span>
              Система
            </NavLink>
            <NavLink 
              to="/admin/settings" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
            >
              <span className="nav-icon">⚙️</span>
              Настройки
            </NavLink>
          </nav>
        </aside>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;