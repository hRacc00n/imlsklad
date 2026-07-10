import { useState, useEffect, useRef } from 'react';
import { useModal } from '../../contexts/ModalContext';
import './NotificationsBell.css';

function NotificationsBell({ userName }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ notifications_enabled: true });
  const dropdownRef = useRef(null);
  const { openModal } = useModal();

  // Загрузка настроек пользователя
  useEffect(() => {
    const loadSettings = async () => {
      if (!userName) return;
      try {
        const response = await fetch(`/api/users/settings?user_name=${encodeURIComponent(userName)}`);
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('Ошибка загрузки настроек:', err);
      }
    };
    loadSettings();
  }, [userName]);

  // Загрузка количества непрочитанных
  const loadUnreadCount = async () => {
    if (!userName) return;
    try {
      const response = await fetch(`/api/notifications/unread_count?user_name=${encodeURIComponent(userName)}`);
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Ошибка загрузки счётчика уведомлений:', err);
    }
  };

  // Загрузка списка уведомлений (только непрочитанные)
  const loadNotifications = async () => {
    if (!userName) return;
    setLoading(true);
    try {
      // Загружаем только непрочитанные уведомления
      const response = await fetch(`/api/notifications?user_name=${encodeURIComponent(userName)}&only_unread=true`);
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error('Ошибка загрузки уведомлений:', err);
    } finally {
      setLoading(false);
    }
  };

  // Отметить уведомление как прочитанное (скрыть для пользователя)
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      // Удаляем из списка (оно помечено как прочитанное в БД)
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Ошибка отметки уведомления:', err);
    }
  };

  // Отметить все как прочитанные (только для текущего пользователя)
  const markAllRead = async () => {
    try {
      await fetch(`/api/notifications/mark_all_read?user_name=${encodeURIComponent(userName)}`, {
        method: 'PUT',
      });
      // Очищаем список (все помечены как прочитанные в БД)
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Ошибка отметки всех уведомлений:', err);
    }
  };

  // Клик по уведомлению
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Если есть task_id — открываем модальное окно
    if (notification.task_id) {
      fetch(`/api/tasks/${notification.task_id}`)
        .then(r => r.json())
        .then(task => {
          // Определяем тип задачи для модалки
          const taskType = task.type || 'arrival';
          openModal(task, taskType);
        })
        .catch(err => console.error('Ошибка загрузки задачи:', err));
    } else if (notification.link) {
      window.location.href = notification.link;
    }
    
    setIsOpen(false);
  };

  // Показать тост (всплывающее уведомление)
  const showToast = (notification) => {
    if (!settings.notifications_enabled) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">🔔 ${notification.title}</div>
        <div class="toast-text">${notification.text}</div>
      </div>
      <button class="toast-close">✕</button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });
  };

  // SSE обновление счётчика
  useEffect(() => {
    const handleSSEEvent = (event) => {
      const data = event.detail;
      
      // Обновление счётчика непрочитанных
      if (data.type === 'notification_count_updated' && data.data?.user_name === userName) {
        setUnreadCount(data.data.count || 0);
      }
      
      // Новое уведомление
      if (data.type === 'notification_created' && data.data?.user_name === userName) {
        // Добавляем новое уведомление в список
        setNotifications(prev => [data.data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        if (data.data.notification) {
          showToast(data.data.notification);
        }
      }
    };

    window.addEventListener('sse-message', handleSSEEvent);
    return () => window.removeEventListener('sse-message', handleSSEEvent);
  }, [userName]);

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Загрузка при открытии
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Первоначальная загрузка
  useEffect(() => {
    loadUnreadCount();
  }, [userName]);

  return (
    <div className="notifications-bell" ref={dropdownRef}>
      <button 
        className={`bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Уведомления"
      >
        🔔
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <span className="notifications-title">Уведомления</span>
            {unreadCount > 0 && (
              <button className="notifications-mark-all" onClick={markAllRead}>
                Все прочитаны
              </button>
            )}
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="notifications-loading">Загрузка...</div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">Нет непрочитанных уведомлений</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="notification-item unread"
                >
                  <div 
                    className="notification-content"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-text">{notification.text}</div>
                    <div className="notification-time">{notification.time_ago}</div>
                  </div>
                  <div className="notification-actions">
                    <button 
                      className="notification-hide-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      title="Скрыть уведомление"
                    >
                      👁️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsBell;