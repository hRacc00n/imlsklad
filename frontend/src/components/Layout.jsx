import { Outlet } from 'react-router-dom';
import Header from './Header';

function Layout({ user, onLogout }) {
  return (
    <div className="layout">
      <Header user={user} onLogout={onLogout} />
      <main className="layout-content">
        <Outlet />  {/* Здесь будут рендериться страницы */}
      </main>
    </div>
  );
}

export default Layout;