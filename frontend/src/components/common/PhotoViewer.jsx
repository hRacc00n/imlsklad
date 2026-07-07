import './PhotoViewer.css';

function PhotoViewer({ photos, onPhotoClick }) {
  if (!photos || photos.length === 0) {
    return null;
  }

  // Показываем максимум 4 фото
  const displayPhotos = photos.slice(0, 4);
  const remainingCount = photos.length - 4;

  return (
    <div className="photo-viewer">
      {displayPhotos.map((photo, index) => (
        <div 
          key={index} 
          className="photo-thumbnail"
          onClick={() => onPhotoClick && onPhotoClick(index)}
        >
          <img src={photo} alt={`Фото ${index + 1}`} />
          {index === 3 && remainingCount > 0 && (
            <div className="photo-more-overlay">
              +{remainingCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PhotoViewer;