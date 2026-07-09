import { useState } from 'react';
import ActionButton from '../common/ActionButton';
import './CommentItem.css';

function CommentItem({ comment, currentUser, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || '');

  const isAuthor = currentUser?.name === comment.author;
  const isDeleted = comment.is_deleted;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(comment.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(comment.text || '');
    setIsEditing(false);
  };

  if (isDeleted) {
    return (
      <div className="comment-item comment-deleted">
        <span className="comment-deleted-text">🗑️ Комментарий удалён</span>
        <span className="comment-deleted-date">{formatDate(comment.updated_at)}</span>
      </div>
    );
  }

  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="comment-author">{comment.author}</span>
        <span className="comment-date">{formatDate(comment.created_at)}</span>
        {comment.is_edited && <span className="comment-edited">(отредактировано)</span>}
      </div>

      {isEditing ? (
        <div className="comment-edit">
          <textarea
            className="comment-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
          />
          <div className="comment-edit-actions">
            <ActionButton variant="outline" size="small" onClick={handleCancelEdit}>
              Отмена
            </ActionButton>
            <ActionButton variant="primary" size="small" onClick={handleSaveEdit}>
              Сохранить
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="comment-text">{comment.text}</div>
      )}

      {isAuthor && !isEditing && (
        <div className="comment-actions">
          <button className="comment-action-btn" onClick={() => setIsEditing(true)}>
            ✏️
          </button>
          <button
            className="comment-action-btn comment-action-delete"
            onClick={() => {
              if (confirm('Удалить комментарий?')) {
                onDelete && onDelete(comment.id);
              }
            }}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}

export default CommentItem;