import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import ActionButton from '../common/ActionButton';
import ModalCloseButton from '../common/ModalCloseButton';
import ImageGallery from '../common/ImageGallery';
import PhotoUploader from '../common/PhotoUploader';
import { getAvailableActions } from '../../utils/taskActions';
import './TaskModal.css';

function TaskModal({ onPhotoUploadStart, onPhotoUploadComplete }) {
  const { isOpen, task, taskType, actions, closeModal, updateTask } = useModal();
  const { user } = useAuth();
  const modalRef = useRef(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [editPhotos, setEditPhotos] = useState([]);

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
  const availableActions = getAvailableActions(user, task);

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

  const updateTaskInModal = (updatedData) => {
    if (updateTask) {
      updateTask({ ...task, ...updatedData });
    }
  };

  const handleTake = async () => {
    if (!task || !actions.onTake) return;
    setIsLoading(true);
    try {
      const result = await actions.onTake(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при взятии задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task || !actions.onComplete) return;
    setIsLoading(true);
    try {
      const result = await actions.onComplete(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при выполнении задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!task || !actions.onDecline) return;
    setIsLoading(true);
    try {
      const result = await actions.onDecline(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при отказе от задачи');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!task || !actions.onReassign) return;
    setIsLoading(true);
    try {
      const result = await actions.onReassign(task.id);
      if (result && result.task) {
        updateTaskInModal(result.task);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при переназначении задачи');
    } finally {
      setIsLoading(false);
    }
  };

  // Режим редактирования
  const enableEditing = () => {
    setIsEditing(true);
    setEditValues({
      supplier: task.supplier || '',
      comment: task.comment || '',
    });
    // Передаём существующие фото в PhotoUploader
    setEditPhotos(task.photos || []);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValues({});
    setEditPhotos([]);
  };

  const handleSaveEdit = async () => {
    if (!task) return;
    setIsLoading(true);
    try {
      // 1. Определяем, какие фото новые (base64) и какие старые (ссылки)
      const oldPhotos = task.photos || [];
      
      // 2. Разделяем: если строка начинается с 'data:image' — это новое фото (base64)
      const newBase64Photos = editPhotos.filter(p => p.startsWith('data:image'));
      const existingPhotoUrls = editPhotos.filter(p => !p.startsWith('data:image'));
      
      // 3. Загружаем только новые фото
      let uploadedPhotoUrls = [];
      if (newBase64Photos.length > 0 && actions.onUploadPhotos) {
        try {
          uploadedPhotoUrls = await actions.onUploadPhotos(task.id, newBase64Photos);
        } catch (photoErr) {
          console.warn('Ошибка загрузки фото:', photoErr);
          uploadedPhotoUrls = [];
        }
      }
      
      // 4. Объединяем старые и новые фото
      const allPhotos = [...oldPhotos, ...uploadedPhotoUrls];
      
      // 5. Обновляем задачу
      const result = await actions.onEdit(task.id, editValues, allPhotos);
      if (result && result.task) {
        updateTaskInModal(result.task);
        setIsEditing(false);
        if (actions.onRefresh) actions.onRefresh();
      } else {
        const updatedTask = { ...task, ...editValues, photos: allPhotos };
        updateTaskInModal(updatedTask);
        setIsEditing(false);
        if (actions.onRefresh) actions.onRefresh();
      }
    } catch (err) {
      alert('Ошибка при сохранении: ' + err.message);
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
              {isEditing ? (
                <input
                  type="text"
                  className="modal-edit-input"
                  value={editValues.supplier || ''}
                  onChange={(e) => setEditValues({ ...editValues, supplier: e.target.value })}
                />
              ) : (
                <span>{task.supplier || '—'}</span>
              )}
            </div>
            <div className="modal-field">
              <label>Комментарий</label>
              {isEditing ? (
                <textarea
                  className="modal-edit-textarea"
                  value={editValues.comment || ''}
                  onChange={(e) => setEditValues({ ...editValues, comment: e.target.value })}
                  rows={4}
                />
              ) : (
                <div className="modal-comment-box">{task.comment || '—'}</div>
              )}
            </div>
            <div className="modal-field">
              <label>Фотографии</label>
              {isEditing ? (
                <PhotoUploader
                  onPhotosChange={setEditPhotos}
                  existingPhotos={editPhotos}
                  onUploadStart={actions.onPhotoUploadStart}
                  onUploadComplete={actions.onPhotoUploadComplete}
                />
              ) : (
                task.photos && task.photos.length > 0 && (
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
                )
              )}
            </div>
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
          {isEditing ? (
            // Режим редактирования
            <>
              <ActionButton variant="outline" size="large" onClick={cancelEditing}>
                Отмена
              </ActionButton>
              <ActionButton variant="success" size="large" onClick={handleSaveEdit} disabled={isLoading}>
                💾 Сохранить
              </ActionButton>
            </>
          ) : (
            // Режим просмотра
            <>
              {availableActions.canTake && (
                <ActionButton variant="primary" size="large" onClick={handleTake} disabled={isLoading}>
                  Взять в работу
                </ActionButton>
              )}
              {availableActions.canComplete && (
                <ActionButton variant="success" size="large" onClick={handleComplete} disabled={isLoading}>
                  ✅ Выполнить
                </ActionButton>
              )}
              {availableActions.canDecline && (
                <ActionButton variant="danger" size="large" onClick={handleDecline} disabled={isLoading}>
                  ❌ Отказаться
                </ActionButton>
              )}
              {availableActions.canReassign && (
                <ActionButton variant="warning" size="large" onClick={handleReassign} disabled={isLoading}>
                  📥 Забрать задачу
                </ActionButton>
              )}
              {task.status === 'completed' && (
                <span className="status-completed-modal">✅ Задача завершена</span>
              )}

              {/* Кнопка редактирования */}
              {user?.role === 'admin' || user?.name === task?.author ? (
                <ActionButton variant="outline" size="large" onClick={enableEditing}>
                  ✏️ Редактировать
                </ActionButton>
              ) : null}

              <ActionButton variant="outline" size="large" onClick={closeModal}>
                Закрыть
              </ActionButton>
            </>
          )}
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