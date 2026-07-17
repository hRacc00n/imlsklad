import { useState, useEffect } from 'react';
import PhotoUploader from '../common/PhotoUploader';
import FileUploader from '../common/FileUploader';
import './PersonalTaskFormModal.css';

function PersonalTaskFormModal({ isOpen, onClose, onSubmit, currentUser, isSubmitting = false }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState([]);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Загрузка списка пользователей
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      // Сброс формы при открытии
      setTitle('');
      setDescription('');
      setAssignedTo([]);
      setItems([]);
      setNewItem('');
      setFiles([]);
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleUserToggle = (userName) => {
    if (assignedTo.includes(userName)) {
      setAssignedTo(assignedTo.filter(u => u !== userName));
    } else {
      setAssignedTo([...assignedTo, userName]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Введите название задачи');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo,
      items: items,
    }, files);
  };

  return (
    <div className="personal-task-form-overlay" onClick={onClose}>
      <div className="personal-task-form-content" onClick={(e) => e.stopPropagation()}>
        <button className="personal-task-form-close" onClick={onClose}>✕</button>

        <h2>📋 Создать задачу</h2>

        <form onSubmit={handleSubmit}>
          <div className="personal-task-form-field">
            <label>Название задачи *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название задачи"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="personal-task-form-field">
            <label>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание (необязательно)"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="personal-task-form-field">
            <label>Исполнители</label>
            <div className="personal-task-users-list">
              {loadingUsers ? (
                <span>Загрузка пользователей...</span>
              ) : (
                users.map((user) => (
                  <label key={user.id} className="personal-task-user-checkbox">
                    <input
                      type="checkbox"
                      checked={assignedTo.includes(user.name)}
                      onChange={() => handleUserToggle(user.name)}
                      disabled={isSubmitting}
                    />
                    <span>{user.name}</span>
                  </label>
                ))
              )}
            </div>
            <small className="personal-task-form-hint">
              Если не выбраны исполнители, вы будете исполнителем
            </small>
          </div>

          <div className="personal-task-form-field">
            <label>Подпункты (чекбоксы)</label>
            <div className="personal-task-items-input">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Введите подпункт и нажмите Enter"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!newItem.trim() || isSubmitting}
              >
                Добавить
              </button>
            </div>
            {items.length > 0 && (
              <div className="personal-task-items-list">
                {items.map((item, index) => (
                  <div key={index} className="personal-task-item-tag">
                    <span>☐ {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={isSubmitting}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="personal-task-form-field">
            <label>Файлы</label>
            <FileUploader
              onFilesChange={setFiles}
              existingFiles={[]}
            />
          </div>

          <div className="personal-task-form-actions">
            <button
              type="button"
              className="personal-task-form-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="personal-task-form-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание...' : '📋 Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PersonalTaskFormModal;