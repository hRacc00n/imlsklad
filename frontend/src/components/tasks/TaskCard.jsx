import ActionButton from '../common/ActionButton';
import PhotoViewer from '../common/PhotoViewer';
import './TaskCard.css';

function TaskCard({ task, onTake, onComplete, onDecline, onClick, onPhotoClick }) {
  const {
    id,
    author,
    created_at,
    supplier,
    comment,
    photos = [],
    assigned_to,
    status,
    comments_count = 0,
  } = task;

  const getStatusInfo = () => {
    switch (status) {
      case 'new':
        return { label: 'Новая', class: 'status-new' };
      case 'in_progress':
        return { label: `В работе у ${assigned_to || '...'}`, class: 'status-in_progress' };
      case 'completed':
        return { label: '✅ Завершена', class: 'status-completed' };
      default:
        return { label: 'Неизвестно', class: '' };
    }
  };

  const statusInfo = getStatusInfo();

  const handleClick = (e) => {
    if (e.target.closest('.task-actions')) return;
    if (onClick) onClick(task);
  };

  const truncateComment = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="task-card" onClick={handleClick}>
      {/* Статусная полоска */}
      <div className={`task-status-bar ${statusInfo.class}`}>
        {statusInfo.label}
      </div>

      <div className="task-card-body">
        {/* Шапка: Автор + Дата */}
        <div className="task-card-header">
          <span className="task-author">
            <span className="task-author-label">Автор:</span> {author}
          </span>
          <span className="task-date">🕐 {created_at}</span>
        </div>

        {/* Кто привез */}
        <div className="task-supplier">
          <strong>Кто привез:</strong> {supplier}
        </div>

        {/* Комментарий с фиксированной высотой */}
        <div className="task-comment-box">
          {truncateComment(comment)}
        </div>

        {/* Превью фото */}
        <PhotoViewer photos={photos} onPhotoClick={onPhotoClick} />

        {/* Низ карточки */}
        <div className="task-card-footer">
          <div className="task-footer-row">
            {comments_count > 0 && (
              <div className="task-comments-indicator">
                💬 {comments_count}
              </div>
            )}
            {/* Исполнитель теперь отображается только в статусной полоске сверху */}
          </div>

          <div className="task-actions" onClick={(e) => e.stopPropagation()}>
            {status === 'new' && (
              <ActionButton
                variant="primary"
                size="medium"
                onClick={() => onTake && onTake(id)}
              >
                Взять в работу
              </ActionButton>
            )}
            {status === 'in_progress' && (
              <>
                <ActionButton
                  variant="success"
                  size="medium"
                  onClick={() => onComplete && onComplete(id)}
                >
                  Выполнить
                </ActionButton>
                <ActionButton
                  variant="danger"
                  size="medium"
                  onClick={() => onDecline && onDecline(id)}
                >
                  Отказаться
                </ActionButton>
              </>
            )}
            {status === 'completed' && (
              <span className="status-completed">✅ Завершена</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;