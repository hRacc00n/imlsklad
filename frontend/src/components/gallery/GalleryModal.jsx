import { useState, useEffect } from 'react';
import PhotoUploader from '../common/PhotoUploader';
import ImageGallery from '../common/ImageGallery';
import './GalleryModal.css';

function GalleryModal({ 
  isOpen, 
  album, 
  onClose, 
  onUpdate, 
  onAddComment,
  currentUser,
  userRole,
  comments = [],
  onCommentEdit,
  onCommentDelete,
  isSubmitting = false,
}) {
  const [description, setDescription] = useState('');
  const [newPhotos, setNewPhotos] = useState([]);
  const [isAddingPhotos, setIsAddingPhotos] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (album) {
      setDescription(album.description || '');
      setNewPhotos([]);
    }
  }, [album]);

  if (!isOpen || !album) return null;

  const canEdit = currentUser?.name === album.author;
  const canDelete = currentUser?.name === album.author || userRole === 'admin';

  const handleSave = async () => {
    if (newPhotos.length === 0 && description === album.description) {
      alert('Нет изменений для сохранения');
      return;
    }
    
    await onUpdate(album.id, {
      description: description,
      photos: newPhotos,
      author: currentUser?.name,
    });
    
    setNewPhotos([]);
    setIsAddingPhotos(false);
    
    // Отправляем SSE событие об обновлении
    window.dispatchEvent(new CustomEvent('sse-message', {
      detail: { 
        type: 'gallery_updated', 
        data: { 
          action: 'updated', 
          album_id: album.id 
        } 
      }
    }));
  };

  const handlePhotoClick = (index) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment(album.id, commentText.trim());
      setCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = (commentId, newText) => {
    onCommentEdit(commentId, newText);
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = (commentId) => {
    if (confirm('Удалить комментарий?')) {
      onCommentDelete(commentId);
    }
  };

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

  const allPhotos = album.photos || [];

  return (
    <div className="gallery-modal-overlay" onClick={onClose}>
      <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="gallery-modal-close" onClick={onClose}>✕</button>

        <div className="gallery-modal-body">
          {/* Заголовок */}
          <div className="gallery-modal-header">
            <h2>{album.city}</h2>
            <div className="gallery-modal-meta">
              <span>📅 {formatDate(album.date)}</span>
              <span>👤 {album.author}</span>
              <span>📸 {album.photos_count || 0} фото</span>
            </div>
          </div>

          {/* Фотографии */}
          <div className="gallery-modal-photos">
            {allPhotos.length > 0 ? (
              <div className="gallery-modal-photos-grid">
                {allPhotos.map((photo, index) => (
                  <div 
                    key={index} 
                    className="gallery-modal-photo-item"
                    onClick={() => handlePhotoClick(index)}
                  >
                    <img src={photo} alt={`Фото ${index + 1}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="gallery-modal-no-photos">
                <p>📷 Нет фотографий</p>
              </div>
            )}
          </div>

          {/* Добавление фото */}
          {/* Добавление фото (доступно всем пользователям) */}
          <div className="gallery-modal-add-photos">
            <button 
              className="gallery-modal-add-photos-btn"
              onClick={() => setIsAddingPhotos(!isAddingPhotos)}
            >
              {isAddingPhotos ? '✕ Скрыть' : '➕ Добавить фотографии'}
            </button>
            
            {isAddingPhotos && (
              <div className="gallery-modal-photo-uploader">
                <PhotoUploader 
                  onPhotosChange={setNewPhotos}
                  existingPhotos={[]}
                />
                {newPhotos.length > 0 && (
                  <button 
                    className="gallery-modal-save-btn"
                    onClick={handleSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Сохранение...' : '💾 Сохранить фото'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Описание */}
          {album.description && (
            <div className="gallery-modal-description">
              <p>{album.description}</p>
            </div>
          )}

          {/* Комментарии */}
          <div className="gallery-modal-comments">
            <h4>💬 Комментарии ({comments.length})</h4>
            
            {comments.length === 0 ? (
              <p className="gallery-modal-no-comments">Нет комментариев</p>
            ) : (
              <div className="gallery-modal-comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="gallery-modal-comment">
                    <div className="gallery-modal-comment-header">
                      <span className="gallery-modal-comment-author">
                        {comment.author}
                      </span>
                      <span className="gallery-modal-comment-date">
                        {formatDate(comment.created_at)}
                        {comment.is_edited && ' (ред.)'}
                      </span>
                    </div>
                    
                    {editingCommentId === comment.id ? (
                      <div className="gallery-modal-comment-edit">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          rows={2}
                        />
                        <div className="gallery-modal-comment-edit-actions">
                          <button onClick={() => setEditingCommentId(null)}>Отмена</button>
                          <button 
                            onClick={() => handleEditComment(comment.id, editingCommentText)}
                            disabled={!editingCommentText.trim()}
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="gallery-modal-comment-text">
                          {comment.text}
                        </div>
                        {currentUser?.name === comment.author && (
                          <div className="gallery-modal-comment-actions">
                            <button 
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text);
                              }}
                              className="gallery-modal-comment-edit-btn"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="gallery-modal-comment-delete-btn"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Форма добавления комментария */}
            <div className="gallery-modal-comment-input">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать комментарий..."
                rows={2}
                disabled={isSubmittingComment}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <button 
                onClick={handleSendComment}
                disabled={!commentText.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Галерея для просмотра фото в полном размере */}
      <ImageGallery
        photos={allPhotos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={galleryIndex}
      />
    </div>
  );
}

export default GalleryModal;