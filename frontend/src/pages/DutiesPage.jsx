import { useState, useEffect } from 'react';
import axios from 'axios';
import DateRangePicker from '../components/common/DateRangePicker';
import './DutiesPage.css';

function DutiesPage({ user }) {
  const [duties, setDuties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date_start: '',
    date_end: '',
  });
  const [error, setError] = useState('');

  const loadDuties = async () => {
    try {
      const response = await axios.get('/api/calendar/duties/list');
      // Фильтруем только активные дежурства (date_end >= сегодня)
      const now = new Date();
      const activeDuties = response.data.filter(duty => {
        const endDate = new Date(duty.date_end);
        return endDate >= now;
      });
      setDuties(activeDuties);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки дежурств:', err);
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
    loadDuties();
    loadUsers();
  }, []);

  const handleDelete = async (dutyId) => {
    if (!confirm('Удалить дежурство?')) return;
    try {
      await axios.delete(`/api/calendar/duties/${dutyId}`, {
        data: { author: user?.name }
      });
      loadDuties();
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
      await axios.post('/api/calendar/duties', {
        ...formData,
        author: user?.name
      });
      setShowModal(false);
      setFormData({ user_id: '', date_start: '', date_end: '' });
      loadDuties();
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
    <div className="duties-content">
      <div className="duties-header">
        <h1>🔄 Дежурства</h1>
        <button className="btn-add" onClick={openCreateModal}>➕ Добавить дежурство</button>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="duties-table-wrap">
          <table className="duties-table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>Начало</th>
                <th>Окончание</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {duties.length === 0 ? (
                <tr>
                  <td colSpan="4" className="duties-empty">Нет дежурств</td>
                </tr>
              ) : (
                duties.map(duty => (
                  <tr key={duty.id}>
                    <td>{getUserName(duty.user_id)}</td>
                    <td>{formatDate(duty.date_start)}</td>
                    <td>{formatDate(duty.date_end)}</td>
                    <td className="actions">
                      <button className="btn-delete" onClick={() => handleDelete(duty.id)}>🗑️</button>
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
            <h2>➕ Добавить дежурство</h2>
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
                <label>Период дежурства</label>
                <DateRangePicker
                  value={{
                    startDate: formData.date_start ? new Date(formData.date_start) : null,
                    endDate: formData.date_end ? new Date(formData.date_end) : null,
                  }}
                  onChange={({ startDate, endDate }) => {
                    setFormData({ 
                      ...formData, 
                      date_start: startDate ? startDate.toISOString() : '',
                      date_end: endDate ? endDate.toISOString() : '',
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

export default DutiesPage;