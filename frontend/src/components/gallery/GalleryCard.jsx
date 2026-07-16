import { useState } from 'react';
import './GalleryCard.css';

function GalleryCard({ album, onClick, onDelete, currentUser, userRole }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = currentUser?.name === album.author || userRole === 'admin';

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Удалить альбом "${album.city}"?`)) return;
    
    setIsDeleting(true);
    try {
      await onDelete(album.id);
    } catch (err) {
      alert('Ошибка при удалении альбома');
    } finally {
      setIsDeleting(false);
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

  // Берем первое фото для превью (если есть)
  const previewPhoto = album.photos && album.photos.length > 0 ? album.photos[0] : null;

  return (
    <div className="gallery-card" onClick={() => onClick(album)}>
      <div className="gallery-card-image">
        {previewPhoto ? (
          <img src={previewPhoto} alt={album.city} />
        ) : (
          <div className="gallery-card-no-image">📷</div>
        )}
        <div className="gallery-card-photo-count">
          📸 {album.photos_count || 0}
        </div>
      </div>
      
      <div className="gallery-card-body">
        <div className="gallery-card-header">
          <h3 className="gallery-card-city">{album.city}</h3>
          {canDelete && (
            <button 
              className="gallery-card-delete-btn"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Удалить альбом"
            >
              🗑️
            </button>
          )}
        </div>
        
        <div className="gallery-card-meta">
          <span className="gallery-card-date">📅 {formatDate(album.date)}</span>
          <span className="gallery-card-author">👤 {album.author}</span>
        </div>
        
        {album.description && (
          <p className="gallery-card-description">{album.description}</p>
        )}
        
        <div className="gallery-card-footer">
          <span className="gallery-card-comments">
            💬 {album.comments_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default GalleryCard;