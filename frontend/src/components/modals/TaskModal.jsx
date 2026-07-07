import { useEffect, useRef } from 'react';
import { useModal } from '../../contexts/ModalContext';
import ActionButton from '../common/ActionButton';
import ModalCloseButton from '../common/ModalCloseButton';
import './TaskModal.css';

function TaskModal() {
  const { isOpen, task, taskType, closeModal } = useModal();
  const modalRef = useRef(null);

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

  if (!isOpen || !task) return null;

  // Определяем статус
  const getStatusInfo = () => {
    switch (task.status) {
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

  // Заголовок: "Поступление от {supplier}"
  const getTitle = () => {
    switch (taskType) {
      case 'arrival':
        return `📦 Поступление от ${task.supplier || 'Неизвестно'}`;
      case 'region':
        return `🌍 Регион: ${task.region || 'Неизвестно'}`;
      case 'spb':
        return `🏙️ СПб: ${task.terminal || 'Неизвестно'}`;
      default:
        return `📋 Задача #${task.id}`;
    }
  };

  // Рендерим специфичные поля
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
                    <img key={idx} src={photo} alt={`Фото ${idx + 1}`} className="modal-photo" />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      case 'region':
        return (
          <>
            <div className="modal-field">
              <label>Регион</label>
              <span>{task.region || '—'}</span>
            </div>
            <div className="modal-field">
              <label>Координатор</label>
              <span>{task.coordinator || '—'}</span>
            </div>
          </>
        );
      case 'spb':
        return (
          <>
            <div className="modal-field">
              <label>Терминал</label>
              <span>{task.terminal || '—'}</span>
            </div>
          </>
        );
      default:
        return (
          <div className="modal-field">
            <label>Описание</label>
            <span>{task.description || '—'}</span>
          </div>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content task-modal-content" ref={modalRef}>
        {/* Статусная полоска */}
        <div className={`modal-status-bar ${statusInfo.class}`}>
          {statusInfo.label}
        </div>

        <div className="modal-header">
          <h2>{getTitle()}</h2>
          <button className="modal-close" onClick={closeModal}>✕</button>
        </div>

        <div className="modal-body">
          {/* Автор + Дата */}
          <div className="modal-meta">
            <span className="modal-author">✍️ {task.author || '—'}</span>
            <span className="modal-date">🕐 {task.created_at || '—'}</span>
          </div>

          {/* Типовые поля */}
          {renderTypeSpecificFields()}

          {/* Блок комментариев (заглушка) */}
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
          {task.status === 'new' && (
            <ActionButton variant="primary" size="large" onClick={() => {}}>
              Взять в работу
            </ActionButton>
          )}
          {task.status === 'in_progress' && (
            <>
              <ActionButton variant="success" size="large" onClick={() => {}}>
                ✅ Выполнить
              </ActionButton>
              <ActionButton variant="danger" size="large" onClick={() => {}}>
                ❌ Отказаться
              </ActionButton>
            </>
          )}
          <ActionButton variant="outline" size="large" onClick={closeModal}>
            Закрыть
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;