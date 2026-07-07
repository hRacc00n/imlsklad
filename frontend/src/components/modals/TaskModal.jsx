import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import ActionButton from '../common/ActionButton';
import ModalCloseButton from '../common/ModalCloseButton';
import ImageGallery from '../common/ImageGallery';
import { getAvailableActions } from '../../utils/taskActions';
import './TaskModal.css';

function TaskModal() {
  const { isOpen, task, taskType, closeModal } = useModal();
  const { user } = useAuth();
  const modalRef = useRef(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeModal]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const handlePhotoClick = (index) => {
    if (!task?.photos || task.photos.length === 0) return;
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const getStatusInfo = () => {
    switch (task?.status) {
      case 'new':
        return { label: 'Новая', class: 'status-new' };
      case 'in_progress':
        return { label: `В работе у ${task.assigned_to || '...'}`, class: 'status-in_progress' };
      case 'completed':
        return { label: '✅ Завершена', class: 'status-completed' };
      default:
        return { label: 'Неизвестно', class: '' };
    }
  };

  const statusInfo = getStatusInfo();
  const actions = getAvailableActions(user, task);

  const getTitle = () => {
    switch (taskType) {
      case 'arrival':
        return `📦 Поступление от ${task?.supplier || 'Неизвестно'}`;
      case 'region':
        return `🌍 Регион: ${task?.region || 'Неизвестно'}`;
      case 'spb':
        return `🏙️ СПб: ${task?.terminal || 'Неизвестно'}`;
      default:
        return `📋 Задача #${task?.id}`;
    }
  };

  // Обработчики действий
  const handleTake = async () => {
    if (!task) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/take`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: user?.name || 'Неизвестно' }),
      });
      if (response.ok) {
        closeModal();
        window.location.reload(); // или обновить список задач
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при взятии задачи');
      }
    } catch (err) {
      alert('Ошибка при взятии задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'PUT',
      });
      if (response.ok) {
        closeModal();
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при выполнении задачи');
      }
    } catch (err) {
      alert('Ошибка при выполнении задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!task) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/decline`, {
        method: 'PUT',
      });
      if (response.ok) {
        closeModal();
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при отказе от задачи');
      }
    } catch (err) {
      alert('Ошибка при отказе от задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!task) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/reassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: user?.name || 'Неизвестно' }),
      });
      if (response.ok) {
        closeModal();
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.message || 'Ошибка при переназначении задачи');
      }
    } catch (err) {
      alert('Ошибка при переназначении задачи');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const renderTypeSpecificFields = () => {
    switch (taskType) {
      case 'arrival':
        return (
          <>
            <div className="modal-field">
              <label>Кто привез</label>
              <span>{task.supplier || '—'}</span>
            </div>
            <div className="modal-field">
              <label>Комментарий</label>
              <div className="modal-comment-box">{task.comment || '—'}</div>
            </div>
            {task.photos && task.photos.length > 0 && (
              <div className="modal-field">
                <label>Фотографии</label>
                <div className="modal-photos">
                  {task.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Фото ${idx + 1}`}
                      className="modal-photo"
                      onClick={() => handlePhotoClick(idx)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content task-modal-content" ref={modalRef}>
        <div className={`modal-status-bar ${statusInfo.class}`}>
          {statusInfo.label}
        </div>

        <div className="modal-header">
          <h2>{getTitle()}</h2>
          <ModalCloseButton onClick={closeModal} />
        </div>

        <div className="modal-body">
          <div className="modal-meta">
            <span className="modal-author">✍️ {task.author || '—'}</span>
            <span className="modal-date">🕐 {task.created_at || '—'}</span>
          </div>

          {renderTypeSpecificFields()}

          <div className="modal-comments">
            <h4>💬 Комментарии</h4>
            <div className="comments-list">
              <div className="comment-item">
                <span className="comment-author">Анна Менеджер</span>
                <span className="comment-text">Проверил документы, всё в порядке.</span>
                <span className="comment-date">Сегодня 14:35</span>
              </div>
            </div>
            <div className="comment-input-wrap">
              <input type="text" placeholder="Написать комментарий..." />
              <ActionButton variant="primary" size="medium">
                Отправить
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {/* Новая задача */}
          {actions.canTake && (
            <ActionButton 
              variant="primary" 
              size="large" 
              onClick={handleTake}
              disabled={isLoading}
            >
              Взять в работу
            </ActionButton>
          )}

          {/* Задача в работе у текущего пользователя */}
          {actions.canComplete && (
            <ActionButton 
              variant="success" 
              size="large" 
              onClick={handleComplete}
              disabled={isLoading}
            >
              ✅ Выполнить
            </ActionButton>
          )}
          {actions.canDecline && (
            <ActionButton 
              variant="danger" 
              size="large" 
              onClick={handleDecline}
              disabled={isLoading}
            >
              ❌ Отказаться
            </ActionButton>
          )}

          {/* Задача в работе у другого пользователя */}
          {actions.canReassign && (
            <ActionButton 
              variant="warning" 
              size="large" 
              onClick={handleReassign}
              disabled={isLoading}
            >
              📥 Забрать задачу
            </ActionButton>
          )}

          {task.status === 'completed' && (
            <span className="status-completed-modal">✅ Задача завершена</span>
          )}

          <ActionButton variant="outline" size="large" onClick={closeModal}>
            Закрыть
          </ActionButton>
        </div>
      </div>

      <ImageGallery
        photos={task.photos || []}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
}

export default TaskModal;