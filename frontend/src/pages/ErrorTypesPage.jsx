import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ErrorTypesPage.css';

function ErrorTypesPage() {
  const { user } = useAuth();
  const [errorTypes, setErrorTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });
  const [error, setError] = useState('');

  const loadErrorTypes = async () => {
    try {
      const response = await fetch('/api/error-types?include_inactive=true');
      const data = await response.json();
      setErrorTypes(data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки типов ошибок:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrorTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Укажите название типа ошибки');
      return;
    }

    try {
      const url = editingType
        ? `/api/error-types/${editingType.id}`
        : '/api/error-types';
      
      const method = editingType ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          is_active: formData.is_active,
          author: user?.name,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowModal(false);
        setEditingType(null);
        setFormData({ name: '', is_active: true });
        loadErrorTypes();
      } else {
        setError(data.message || 'Ошибка при сохранении');
      }
    } catch (err) {
      setError('Ошибка при сохранении');
    }
  };

  const handleDelete = async (typeId) => {
    if (!confirm('Деактивировать этот тип ошибки?')) return;
    
    try {
      const response = await fetch(`/api/error-types/${typeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user?.name }),
      });
      const data = await response.json();
      if (data.success) {
        loadErrorTypes();
      }
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const handleRestore = async (typeId) => {
    try {
      const response = await fetch(`/api/error-types/${typeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: true,
          author: user?.name,
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadErrorTypes();
      }
    } catch (err) {
      alert('Ошибка при восстановлении');
    }
  };

  const openEditModal = (type) => {
    setEditingType(type);
    setFormData({ name: type.name, is_active: type.is_active });
    setShowModal(true);
    setError('');
  };

  const openCreateModal = () => {
    setEditingType(null);
    setFormData({ name: '', is_active: true });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', is_active: true });
    setError('');
  };

  return (
    <div className="error-types-content">
      <div className="error-types-header">
        <h1>⚠️ Типы ошибок</h1>
        <button className="btn-add" onClick={openCreateModal}>
          ➕ Добавить тип
        </button>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="error-types-table-wrap">
          <table className="error-types-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {errorTypes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="error-types-empty">
                    Нет типов ошибок
                  </td>
                </tr>
              ) : (
                errorTypes.map(type => (
                  <tr key={type.id} className={!type.is_active ? 'inactive-row' : ''}>
                    <td>{type.id}</td>
                    <td>{type.name}</td>
                    <td>
                      {type.is_active ? (
                        <span className="status-badge active">Активен</span>
                      ) : (
                        <span className="status-badge inactive">Неактивен</span>
                      )}
                    </td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => openEditModal(type)}>
                        ✏️
                      </button>
                      {type.is_active ? (
                        <button className="btn-delete" onClick={() => handleDelete(type.id)}>
                          🗑️
                        </button>
                      ) : (
                        <button className="btn-restore" onClick={() => handleRestore(type.id)}>
                          ♻️
                        </button>
                      )}
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
        <div className="error-types-modal-overlay" onClick={closeModal}>
          <div className="error-types-modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingType ? 'Редактировать тип' : 'Создать тип'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Неверный адрес"
                  required
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <div className="error-types-modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn-save">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ErrorTypesPage;