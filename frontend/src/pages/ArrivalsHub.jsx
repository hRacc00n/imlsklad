import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import TaskCard from '../components/tasks/TaskCard';
import ActionButton from '../components/common/ActionButton';
import { useAuth } from '../contexts/AuthContext';
import PhotoUploader from '../components/common/PhotoUploader';
import './ArrivalsHub.css';

function ArrivalsHub() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ supplier: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const [newPhotos, setNewPhotos] = useState([]);

  // Загрузка задач
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks/arrivals');
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleBack = () => {
    navigate('/');
  };

  const handleTake = (taskId) => {
    console.log(`Задача ${taskId} взята в работу`);
  };

  const handleComplete = (taskId) => {
    console.log(`Задача ${taskId} выполнена`);
  };

  const handleDecline = (taskId) => {
    console.log(`Задача ${taskId} отклонена`);
  };

  const handleCardClick = (task) => {
    openModal(task, 'arrival');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.supplier) {
      alert('Заполните поле "Кто привез"');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Создаём задачу
      const response = await fetch('/api/tasks/arrivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: newTask.supplier,
          comment: newTask.comment || '',
          author: user?.name || 'Неизвестно',
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        // 2. Если есть фото — загружаем их
        if (newPhotos.length > 0) {
          try {
            const photoResponse = await fetch(`/api/tasks/${data.task.id}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                photos: newPhotos,
              }),
            });
            const photoData = await photoResponse.json();
            if (!photoData.success) {
              console.warn('Фото не загружены:', photoData.message);
            }
          } catch (photoErr) {
            console.error('Ошибка загрузки фото:', photoErr);
          }
        }

        setShowCreateModal(false);
        setNewTask({ supplier: '', comment: '' });
        setNewPhotos([]);
        loadTasks();
      } else {
        alert(data.message || 'Ошибка при создании задачи');
      }
    } catch (err) {
      alert('Ошибка при создании задачи');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="arrivals-page">
      <div className="arrivals-header">
        <h1>📦 Поступление</h1>
        <div className="arrivals-actions">
          <button className="btn-create" onClick={() => setShowCreateModal(true)}>
            ➕ Создать поступление
          </button>
          <button className="back-btn" onClick={handleBack}>
            ← Назад
          </button>
        </div>
      </div>

      <div className="arrivals-content">
        {loading ? (
          <p>Загрузка...</p>
        ) : tasks.length === 0 ? (
          <div className="empty-state">Нет задач в этом хабе</div>
        ) : (
          <div className="tasks-grid">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onTake={handleTake}
                onComplete={handleComplete}
                onDecline={handleDecline}
                onClick={handleCardClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="modal-overlay create-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content create-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="create-modal-header">
              <h2>➕ Создать поступление</h2>
              <button className="create-modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="create-modal-body">
              <div className="create-form-group">
                <label>Кто привез *</label>
                <input
                  type="text"
                  value={newTask.supplier}
                  onChange={(e) => setNewTask({ ...newTask, supplier: e.target.value })}
                  placeholder="Введите поставщика или водителя"
                  required
                />
              </div>
              <div className="create-form-group">
                <label>Комментарий</label>
                <textarea
                  value={newTask.comment}
                  onChange={(e) => setNewTask({ ...newTask, comment: e.target.value })}
                  placeholder="Введите комментарий к задаче"
                  rows={4}
                />
              </div>
              <div className="create-form-group">
                <label>Фотографии</label>
                <PhotoUploader
                  onPhotosChange={setNewPhotos}
                  existingPhotos={[]}
                />
              </div>
              <div className="create-modal-footer">
                <button
                  type="button"
                  className="create-btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="create-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArrivalsHub;