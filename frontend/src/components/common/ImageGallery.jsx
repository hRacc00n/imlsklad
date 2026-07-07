import { useState, useEffect, useRef } from 'react';
import './ImageGallery.css';

function ImageGallery({ photos, isOpen, onClose, initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'z' || e.key === 'Z') {
        toggleZoom();
      } else if (e.key === 'r' || e.key === 'R') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const totalPhotos = photos.length;

  const prevImage = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : prev));
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleZoom = () => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoomLevel(2.5);
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newZoom = Math.min(Math.max(zoomLevel + delta, 0.5), 4);
    setZoomLevel(Math.round(newZoom * 10) / 10);
    if (newZoom <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (zoomLevel <= 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="gallery-overlay" onClick={onClose}>
      <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
        <button className="gallery-close" onClick={onClose}>
          ✕
        </button>

        <div
          className="gallery-image-container"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <img
            src={currentPhoto}
            alt={`Фото ${currentIndex + 1}`}
            className="gallery-image"
            style={{
              transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            draggable={false}
            onDoubleClick={toggleZoom}
          />
        </div>

        <div className="gallery-controls">
          <button
            className="gallery-nav gallery-prev"
            onClick={prevImage}
            disabled={currentIndex === 0}
          >
            ‹
          </button>

          <div className="gallery-info">
            <span>
              {currentIndex + 1} / {totalPhotos}
            </span>
            <span className="gallery-zoom-info">
              {Math.round(zoomLevel * 100)}%
              <button className="gallery-zoom-btn" onClick={toggleZoom}>
                🔍
              </button>
              <button className="gallery-reset-btn" onClick={resetZoom}>
                ⟲
              </button>
            </span>
          </div>

          <button
            className="gallery-nav gallery-next"
            onClick={nextImage}
            disabled={currentIndex === totalPhotos - 1}
          >
            ›
          </button>
        </div>

        {totalPhotos > 1 && (
          <div className="gallery-thumbnails">
            {photos.map((photo, index) => (
              <div
                key={index}
                className={`gallery-thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(index);
                  setZoomLevel(1);
                  setPosition({ x: 0, y: 0 });
                }}
              >
                <img src={photo} alt={`Миниатюра ${index + 1}`} />
              </div>
            ))}
          </div>
        )}

        <div className="gallery-hints">
          <span>← → Навигация</span>
          <span>Esc Закрыть</span>
          <span>🖱️ Колесико Zoom</span>
          <span>Двойной клик Увеличить</span>
          <span>R Сбросить</span>
          <span>↕ Перетащить при зуме</span>
        </div>
      </div>
    </div>
  );
}

export default ImageGallery;