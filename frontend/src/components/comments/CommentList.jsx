import { useState, useEffect } from 'react';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import './CommentList.css';

function CommentList({ taskId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await response.json();
      setComments(data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();

    // Подписка на SSE для обновления комментариев
    const handleSSEEvent = (event) => {
      const data = event.detail;
      if (data.type === 'comment_created' && data.data?.task_id === taskId) {
        loadComments();
      }
      if (data.type === 'comment_updated' && data.data?.comment?.task_id === taskId) {
        loadComments();
      }
      if (data.type === 'comment_deleted' && data.data?.task_id === taskId) {
        loadComments();
      }
      if (data.type === 'comment_count_updated' && data.data?.task_id === taskId) {
        // Просто обновляем список
        loadComments();
      }
    };

    window.addEventListener('sse-message', handleSSEEvent);
    return () => window.removeEventListener('sse-message', handleSSEEvent);
  }, [taskId]);

  const handleSendComment = async (text) => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: currentUser?.name || 'Неизвестно',
          text: text.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadComments();
      } else {
        alert(data.message || 'Ошибка при отправке комментария');
      }
    } catch (err) {
      alert('Ошибка при отправке комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId, newText) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: currentUser?.name || 'Неизвестно',
          text: newText,
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadComments();
      } else {
        alert(data.message || 'Ошибка при редактировании комментария');
      }
    } catch (err) {
      alert('Ошибка при редактировании комментария');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: currentUser?.name || 'Неизвестно',
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadComments();
      } else {
        alert(data.message || 'Ошибка при удалении комментария');
      }
    } catch (err) {
      alert('Ошибка при удалении комментария');
    }
  };

  return (
    <div className="comment-list">
      <div className="comment-list-header">
        <h4>💬 Комментарии ({comments.length})</h4>
      </div>

      {loading ? (
        <p className="comment-loading">Загрузка...</p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">Нет комментариев</p>
      ) : (
        <div className="comment-items">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
            />
          ))}
        </div>
      )}

      <CommentInput onSend={handleSendComment} disabled={submitting} />
    </div>
  );
}

export default CommentList;