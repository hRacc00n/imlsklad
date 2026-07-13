import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRoleLabel } from '../utils/roleUtils';
import BurgerMenu from './BurgerMenu';
import './Header.css';
import NotificationsBell from './common/NotificationsBell';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function Header({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { sse } = useAppContext();
  const { updateUserRole } = useAuth();
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

  // Подписка на SSE события для обновления роли
  useEffect(() => {
    const handleSSEEvent = (event) => {
      const data = event.detail;
      console.log('[Header] SSE Event received:', data);
      
      // Если пришло событие обновления роли для текущего пользователя
      if (data.type === 'user_role_updated') {
        const { user_name, new_role } = data.data;
        
        // Проверяем, относится ли событие к текущему пользователю
        if (user?.name === user_name) {
          console.log(`[Header] Роль пользователя ${user_name} обновлена на: ${new_role}`);
          
          // Обновляем роли в состоянии
          const loadRoles = async () => {
            try {
              const response = await axios.get('/api/roles');
              setRoles(response.data);
            } catch (err) {
              console.error('Ошибка загрузки ролей:', err);
            }
          };
          loadRoles();
          
          // Обновляем роль через контекст
          updateUserRole(new_role);
          
          // Диспатчим событие для обновления задач в Dashboard
          window.dispatchEvent(new CustomEvent('user-role-updated', { 
            detail: { user_name, new_role } 
          }));
        }
      }
    };

    window.addEventListener('sse-message', handleSSEEvent);
    return () => window.removeEventListener('sse-message', handleSSEEvent);
  }, [user, updateUserRole]);

  // Подписка на событие обновления роли из других компонентов
  useEffect(() => {
    const handleRoleUpdate = (event) => {
      const { new_role } = event.detail;
      if (user) {
        // Обновляем роль в отображении
        // Компонент перерендерится автоматически, так как user изменился
        console.log('[Header] Роль обновлена через событие:', new_role);
      }
    };

    window.addEventListener('user-role-updated', handleRoleUpdate);
    return () => window.removeEventListener('user-role-updated', handleRoleUpdate);
  }, [user]);

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