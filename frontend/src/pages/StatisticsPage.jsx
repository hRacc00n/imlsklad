import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './StatisticsPage.css';

function StatisticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState(null);
  const [errors, setErrors] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [managers, setManagers] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('indicators');

  // Инициализация дат (по умолчанию — начало текущего месяца и сегодня)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    setDateFrom(formatDateForInput(firstDay));
    setDateTo(formatDateForInput(now));
  }, []);

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const params = `date_from=${dateFrom}&date_to=${dateTo}`;
      
      const [indicatorsRes, errorsRes, complaintsRes, managersRes] = await Promise.all([
        fetch(`/api/statistics?${params}`),
        fetch(`/api/statistics/errors?${params}`),
        fetch(`/api/statistics/complaints?${params}`),
        fetch(`/api/statistics/managers?${params}`),
      ]);
      
      const indicatorsData = await indicatorsRes.json();
      const errorsData = await errorsRes.json();
      const complaintsData = await complaintsRes.json();
      const managersData = await managersRes.json();
      
      setIndicators(indicatorsData);
      setErrors(errorsData);
      setComplaints(complaintsData);
      setManagers(managersData);
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadStatistics();
    }
  }, [dateFrom, dateTo]);

  const handleExport = () => {
    const params = `date_from=${dateFrom}&date_to=${dateTo}`;
    window.open(`/api/statistics/export?${params}`, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="statistics-content">
      <div className="statistics-header">
        <h1>📊 Статистика</h1>
        <button className="btn-export" onClick={handleExport}>
          📥 Скачать отчёт
        </button>
      </div>

      {/* Фильтр по периоду */}
      <div className="statistics-filter">
        <div className="filter-group">
          <label>С даты:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>По дату:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {loading || !indicators ? (
        <p>Загрузка...</p>
      ) : (
        <>
          {/* Карточки с показателями */}
          <div className="statistics-cards">
            <div className="stat-card stat-card-blue">
              <div className="stat-card-icon">📦</div>
              <div className="stat-card-value">{indicators.indicators.shipments_completed}</div>
              <div className="stat-card-label">Отгрузок выполнено</div>
            </div>
            <div className="stat-card stat-card-red">
              <div className="stat-card-icon">⚠️</div>
              <div className="stat-card-value">{indicators.indicators.shipments_with_errors}</div>
              <div className="stat-card-label">Отгрузок с ошибками</div>
            </div>
            <div className="stat-card stat-card-yellow">
              <div className="stat-card-icon">📋</div>
              <div className="stat-card-value">{indicators.indicators.tasks_created}</div>
              <div className="stat-card-label">Задач поставлено</div>
            </div>
            <div className="stat-card stat-card-green">
              <div className="stat-card-icon">✅</div>
              <div className="stat-card-value">{indicators.indicators.tasks_completed}</div>
              <div className="stat-card-label">Задач выполнено</div>
            </div>
            <div className="stat-card stat-card-purple">
              <div className="stat-card-icon">😞</div>
              <div className="stat-card-value">{indicators.indicators.complaints_confirmed}</div>
              <div className="stat-card-label">Жалоб подтверждено</div>
            </div>
          </div>

          {/* Период */}
          <div className="statistics-period">
            Период: {formatDate(indicators.period.date_from)} — {formatDate(indicators.period.date_to)}
          </div>

          {/* Табы */}
          <div className="statistics-tabs">
            <button
              className={`statistics-tab ${activeTab === 'indicators' ? 'active' : ''}`}
              onClick={() => setActiveTab('indicators')}
            >
              📊 Детализация
            </button>
            <button
              className={`statistics-tab ${activeTab === 'errors' ? 'active' : ''}`}
              onClick={() => setActiveTab('errors')}
            >
              ⚠️ Ошибки ({errors.length})
            </button>
            <button
              className={`statistics-tab ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              😞 Жалобы ({complaints.length})
            </button>
            <button
              className={`statistics-tab ${activeTab === 'managers' ? 'active' : ''}`}
              onClick={() => setActiveTab('managers')}
            >
              👥 Менеджеры ({managers.length})
            </button>
          </div>

          {/* Контент табов */}
          <div className="statistics-tab-content">
            {activeTab === 'indicators' && (
              <div className="statistics-details">
                <h3>Детализация задач</h3>
                <table className="statistics-table">
                  <tbody>
                    <tr>
                      <td>Задач из хабов создано</td>
                      <td className="stat-value">{indicators.details.orders_created}</td>
                    </tr>
                    <tr>
                      <td>Личных задач создано</td>
                      <td className="stat-value">{indicators.details.personal_tasks_created}</td>
                    </tr>
                    <tr>
                      <td>Задач из хабов выполнено</td>
                      <td className="stat-value">{indicators.details.orders_completed}</td>
                    </tr>
                    <tr>
                      <td>Личных задач выполнено</td>
                      <td className="stat-value">{indicators.details.personal_tasks_completed}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'errors' && (
              <div className="statistics-errors">
                {errors.length === 0 ? (
                  <p className="statistics-empty">Нет ошибок за период</p>
                ) : (
                  <table className="statistics-table-full">
                    <thead>
                      <tr>
                        <th>Заказ</th>
                        <th>Контрагент</th>
                        <th>Тип ошибки</th>
                        <th>Описание</th>
                        <th>Автор</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map(error => (
                        <tr key={error.id}>
                          <td>{error.order_number || '—'}</td>
                          <td>{error.contractor || '—'}</td>
                          <td><span className="error-badge">{error.error_type_name}</span></td>
                          <td>{error.description || '—'}</td>
                          <td>{error.author}</td>
                          <td>{formatDate(error.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'complaints' && (
              <div className="statistics-complaints">
                {complaints.length === 0 ? (
                  <p className="statistics-empty">Нет жалоб за период</p>
                ) : (
                  <table className="statistics-table-full">
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Категория</th>
                        <th>Текст</th>
                        <th>Статус</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map(complaint => (
                        <tr key={complaint.id}>
                          <td>{complaint.name}</td>
                          <td>{complaint.category_name || '—'}</td>
                          <td className="complaint-text-cell">
                            {complaint.text.length > 100 
                              ? complaint.text.slice(0, 100) + '...' 
                              : complaint.text}
                          </td>
                          <td>
                            <span className={`status-badge status-${complaint.status}`}>
                              {complaint.status === 'new' && '🆕 Новая'}
                              {complaint.status === 'confirmed' && '✅ Подтв.'}
                              {complaint.status === 'rejected' && '❌ Откл.'}
                              {complaint.status === 'archived' && '📦 Архив'}
                            </span>
                          </td>
                          <td>{formatDate(complaint.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'managers' && (
              <div className="statistics-managers">
                {managers.length === 0 ? (
                  <p className="statistics-empty">Нет данных за период</p>
                ) : (
                  <>
                    <table className="statistics-table-full">
                      <thead>
                        <tr>
                          <th>Менеджер</th>
                          <th>Задач из хабов</th>
                          <th>Личных задач</th>
                          <th>Всего</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managers.map(manager => (
                          <tr key={manager.name}>
                            <td><strong>{manager.name}</strong></td>
                            <td>{manager.orders_count}</td>
                            <td>{manager.personal_tasks_count}</td>
                            <td><strong>{manager.total}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Простой SVG-график */}
                    <div className="statistics-chart">
                      <h3>Загрузка менеджеров</h3>
                      <div className="chart-bars">
                        {managers.map(manager => {
                          const maxTotal = Math.max(...managers.map(m => m.total));
                          const width = maxTotal > 0 ? (manager.total / maxTotal) * 100 : 0;
                          return (
                            <div key={manager.name} className="chart-bar-row">
                              <div className="chart-bar-label">{manager.name}</div>
                              <div className="chart-bar-track">
                                <div 
                                  className="chart-bar-fill" 
                                  style={{ width: `${width}%` }}
                                >
                                  {manager.total}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default StatisticsPage;