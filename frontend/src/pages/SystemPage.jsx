import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';
import './SystemPage.css';

function SystemPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(null);

  const loadStats = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/events/stats`);
      const data = await response.json();
      setConnections(data.connections || []);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseConnection = async (clientId) => {
    if (!confirm(`Закрыть соединение ${clientId}?`)) return;
    
    setClosing(clientId);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/events/close/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        loadStats();
      } else {
        alert('Ошибка при закрытии соединения');
      }
    } catch (err) {
      alert('Ошибка при закрытии соединения');
    } finally {
      setClosing(null);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('ru-RU');
  };

  return (
    <div className="system-content">
      <div className="system-header">
        <h1>🖥️ Система</h1>
        <div className="system-stats">
          <span className="stat-badge">
            🔌 Всего соединений: <strong>{connections.length}</strong>
          </span>
          <button className="btn-refresh" onClick={loadStats}>
            🔄 Обновить
          </button>
        </div>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="system-table-wrap">
          {connections.length === 0 ? (
            <div className="empty-state">Нет активных SSE соединений</div>
          ) : (
            <table className="system-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Пользователь</th>
                  <th>IP адрес</th>
                  <th>Подключен с</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => (
                  <tr key={conn.client_id}>
                    <td className="client-id">{conn.client_id}</td>
                    <td><strong>{conn.user}</strong></td>
                    <td>{conn.ip}</td>
                    <td>{formatTime(conn.connected_at)}</td>
                    <td>
                      <button 
                        className="btn-force-close"
                        onClick={() => handleCloseConnection(conn.client_id)}
                        disabled={closing === conn.client_id}
                      >
                        {closing === conn.client_id ? '⏳' : '🔒 Закрыть'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default SystemPage;