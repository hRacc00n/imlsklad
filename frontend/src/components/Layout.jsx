import { Outlet } from 'react-router-dom';
import Header from './Header';
import './Layout.css';

function Layout({ user, onLogout }) {
  return (
    <div className="layout">
      <Header user={user} onLogout={onLogout} />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;