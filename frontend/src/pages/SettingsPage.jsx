import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './SettingsPage.css';

function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/users/settings?user_name=${encodeURIComponent(user?.name || '')}`);
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('Ошибка загрузки настроек:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: user?.name,
          settings,
        }),
      });
      alert('Настройки сохранены');
    } catch (err) {
      alert('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-loading">Загрузка...</div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-layout">
        {/* Боковое меню */}
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <span className="settings-sidebar-icon">⚙️</span>
            <span className="settings-sidebar-title">Настройки</span>
          </div>

          <nav className="settings-sidebar-nav">
            <button 
              className={`settings-nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <span className="nav-icon">🔔</span>
              Уведомления
            </button>
            <button 
              className={`settings-nav-link ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="nav-icon">👤</span>
              Профиль
            </button>
          </nav>
        </aside>

        {/* Контент */}
        <main className="settings-content">
          {activeTab === 'notifications' && (
            <div className="settings-tab">
              <h2>🔔 Уведомления</h2>
              <p className="settings-tab-description">
                Настройте получение уведомлений о новых задачах в хабах, к которым у вас есть доступ
              </p>

              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Push-уведомления</span>
                  <span className="settings-item-description">
                    Включите, чтобы получать push-уведомления в браузере о новых задачах
                  </span>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled !== false}
                    onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                  />
                  <span className="settings-toggle-slider"></span>
                </label>
              </div>

              <button 
                className="settings-save-btn" 
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="settings-tab">
              <h2>👤 Профиль</h2>
              <p className="settings-tab-description">
                Информация о вашем профиле
              </p>
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Имя</span>
                  <span className="settings-item-description">{user?.name}</span>
                </div>
              </div>
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Роль</span>
                  <span className="settings-item-description">{user?.role}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;