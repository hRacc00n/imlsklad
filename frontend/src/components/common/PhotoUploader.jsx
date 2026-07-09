import { useState, useRef, useEffect } from 'react';
import './PhotoUploader.css';

function PhotoUploader({ onPhotosChange, existingPhotos = [], onUploadStart, onUploadComplete }) {
  const [photos, setPhotos] = useState(existingPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    setPhotos(existingPhotos);
  }, [existingPhotos]);

  const processFiles = (files) => {
    if (files.length === 0) return;

    setIsUploading(true);
    if (onUploadStart) onUploadStart();

    const readers = Array.from(files).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target.result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((newPhotos) => {
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      if (onPhotosChange) {
        onPhotosChange(updatedPhotos);
      }
      setIsUploading(false);
      if (onUploadComplete) onUploadComplete();
    }).catch(() => {
      setIsUploading(false);
      if (onUploadComplete) onUploadComplete();
    });
  };

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
    e.target.value = ''; // Сброс, чтобы можно было выбрать те же файлы снова
  };

  const handleCameraCapture = (e) => {
    processFiles(e.target.files);
    e.target.value = ''; // Сброс
  };

  const handleRemovePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    if (onPhotosChange) {
      onPhotosChange(updatedPhotos);
    }
  };

  return (
    <div className="photo-uploader">
      <div className="photo-uploader-actions">
        <button 
          type="button"
          className="photo-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <span className="btn-icon">📁</span>
          Загрузить фото
        </button>
        <button 
          type="button"
          className="photo-camera-btn"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading}
        >
          <span className="btn-icon">📷</span>
          Сделать фото
        </button>
      </div>

      {/* Скрытый input для выбора файлов из галереи */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      {/* Скрытый input для камеры (capture атрибут) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      {isUploading && (
        <div className="photo-uploading-status">⏳ Загрузка фотографий...</div>
      )}

      {photos.length > 0 && (
        <div className="photo-uploader-preview">
          {photos.map((photo, index) => (
            <div key={index} className="photo-uploader-item">
              <img src={photo} alt={`Фото ${index + 1}`} />
              <button 
                className="photo-remove-btn"
                onClick={() => handleRemovePhoto(index)}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PhotoUploader;