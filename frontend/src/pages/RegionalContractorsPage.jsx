import { useState, useEffect } from 'react';
import axios from 'axios';
import './RegionalContractorsPage.css';

function RegionalContractorsPage() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContractor, setNewContractor] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadContractors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/regional-contractors');
      setContractors(response.data || []);
      setError('');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError('Ошибка загрузки списка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractors();
  }, []);

  const handleAdd = async () => {
    const name = newContractor.trim();
    if (!name) {
      setError('Введите название контрагента');
      return;
    }

    try {
      const response = await axios.post('/api/regional-contractors', { contractor: name });
      if (response.data.success) {
        setContractors(response.data.contractors);
        setNewContractor('');
        setSuccess('Контрагент добавлен');
        setTimeout(() => setSuccess(''), 3000);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления');
    }
  };

  const handleDelete = async (index, name) => {
    if (!confirm(`Удалить контрагента "${name}"?`)) return;

    try {
      const response = await axios.delete(`/api/regional-contractors/${index}`);
      if (response.data.success) {
        setContractors(response.data.contractors);
        setSuccess('Контрагент удален');
        setTimeout(() => setSuccess(''), 3000);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const startEditing = (index, name) => {
    setEditingIndex(index);
    setEditingValue(name);
  };

  const handleEdit = async (index) => {
    const name = editingValue.trim();
    if (!name) {
      setError('Введите название контрагента');
      return;
    }

    try {
      const response = await axios.put(`/api/regional-contractors/${index}`, { contractor: name });
      if (response.data.success) {
        setContractors(response.data.contractors);
        setEditingIndex(null);
        setEditingValue('');
        setSuccess('Контрагент обновлен');
        setTimeout(() => setSuccess(''), 3000);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    }
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="regional-contractors-page">
      <div className="page-header">
        <h1>🏢 Региональные контрагенты</h1>
        <p className="page-description">
          Список контрагентов, которые относятся к хабу "Регионы". 
          Задачи от этих контрагентов будут автоматически направляться в хаб "Регионы".
        </p>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      <div className="add-section">
        <input
          type="text"
          className="add-input"
          placeholder="Введите название контрагента..."
          value={newContractor}
          onChange={(e) => setNewContractor(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn-add" onClick={handleAdd}>
          ➕ Добавить
        </button>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : contractors.length === 0 ? (
        <div className="empty-state">Список контрагентов пуст. Добавьте первого контрагента.</div>
      ) : (
        <div className="contractors-list">
          <table className="contractors-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Название контрагента</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((name, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    {editingIndex === index ? (
                      <input
                        type="text"
                        className="edit-input"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEdit(index);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="contractor-name">{name}</span>
                    )}
                  </td>
                  <td>
                    {editingIndex === index ? (
                      <>
                        <button className="btn-save" onClick={() => handleEdit(index)}>
                          💾 Сохранить
                        </button>
                        <button className="btn-cancel" onClick={cancelEditing}>
                          ❌ Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-edit" onClick={() => startEditing(index, name)}>
                          ✏️
                        </button>
                        <button className="btn-delete" onClick={() => handleDelete(index, name)}>
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="total-count">Всего: {contractors.length} контрагентов</div>
        </div>
      )}
    </div>
  );
}

export default RegionalContractorsPage;