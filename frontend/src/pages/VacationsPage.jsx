import { useState, useEffect } from 'react';
import axios from 'axios';
import DateRangePicker from '../components/common/DateRangePicker';
import './VacationsPage.css';

function VacationsPage({ user }) {
  const [vacations, setVacations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date_start: '',
    date_end: '',
  });
  const [error, setError] = useState('');

  const loadVacations = async () => {
    try {
      const response = await axios.get('/api/calendar/vacations/list');
      const now = new Date();
      const activeVacations = response.data.filter(vacation => {
        const endDate = new Date(vacation.date_end);
        return endDate >= now;
      });
      setVacations(activeVacations);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки отпусков:', err);
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  };

  useEffect(() => {
    loadVacations();
    loadUsers();
  }, []);

  const handleDelete = async (vacationId) => {
    if (!confirm('Удалить отпуск?')) return;
    try {
      await axios.delete(`/api/calendar/vacations/${vacationId}`, {
        data: { author: user?.name }
      });
      loadVacations();
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.user_id || !formData.date_start || !formData.date_end) {
      setError('Заполните все поля');
      return;
    }

    try {
      await axios.post('/api/calendar/vacations', {
        ...formData,
        author: user?.name
      });
      setShowModal(false);
      setFormData({ user_id: '', date_start: '', date_end: '' });
      loadVacations();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const openCreateModal = () => {
    setFormData({ user_id: '', date_start: '', date_end: '' });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ user_id: '', date_start: '', date_end: '' });
    setError('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserName = (userId) => {
    const found = users.find(u => u.id === userId);
    return found ? found.name : 'Неизвестно';
  };

  return (
    <div className="vacations-content">
      <div className="vacations-header">
        <h1>🏖️ Отпуска</h1>
        <button className="btn-add" onClick={openCreateModal}>➕ Добавить отпуск</button>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="vacations-table-wrap">
          <table className="vacations-table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Начало</th>
                <th>Окончание</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {vacations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="vacations-empty">Нет отпусков</td>
                </tr>
              ) : (
                vacations.map(vacation => (
                  <tr key={vacation.id}>
                    <td>{getUserName(vacation.user_id)}</td>
                    <td>{formatDate(vacation.date_start)}</td>
                    <td>{formatDate(vacation.date_end)}</td>
                    <td className="actions">
                      <button className="btn-delete" onClick={() => handleDelete(vacation.id)}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content-calendar" onClick={e => e.stopPropagation()}>
            <h2>➕ Добавить отпуск</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Сотрудник</label>
                <select
                  value={formData.user_id}
                  onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                  required
                >
                  <option value="">Выберите сотрудника</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Период отпуска</label>
                <DateRangePicker
                  value={{
                    startDate: formData.date_start ? new Date(formData.date_start) : null,
                    endDate: formData.date_end ? new Date(formData.date_end) : null,
                  }}
                  onChange={({ startDate, endDate }) => {
                    const normalizeToUTCDate = (date) => {
                      if (!date) return '';
                      const d = new Date(Date.UTC(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                        0, 0, 0, 0
                      ));
                      return d.toISOString();
                    };
                    
                    setFormData({ 
                      ...formData, 
                      date_start: normalizeToUTCDate(startDate),
                      date_end: normalizeToUTCDate(endDate),
                    });
                  }}
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Отмена</button>
                <button type="submit" className="btn-save">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VacationsPage;