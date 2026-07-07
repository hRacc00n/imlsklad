import { useState } from 'react';
import './PhotoViewer.css';

function PhotoViewer({ photos, onPhotoClick }) {
  if (!photos || photos.length === 0) {
    return null;
  }

  // Показываем только первые 4 фото
  const displayPhotos = photos.slice(0, 4);
  const remaining = photos.length - 4;

  return (
    <div className="photo-viewer">
      {displayPhotos.map((photo, index) => (
        <div
          key={index}
          className="photo-thumbnail"
          onClick={() => onPhotoClick && onPhotoClick(index)}
        >
          <img
            src={photo}
            alt={`Фото ${index + 1}`}
            loading="lazy"
          />
        </div>
      ))}
      {remaining > 0 && (
        <div className="photo-thumbnail photo-more">
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default PhotoViewer;