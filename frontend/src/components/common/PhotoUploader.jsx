import { useState, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import './PhotoUploader.css';

function PhotoUploader({ onPhotosChange, existingPhotos = [], onUploadStart, onUploadComplete }) {
  const [photos, setPhotos] = useState(existingPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    setPhotos(existingPhotos);
  }, [existingPhotos]);

  const processFiles = async (files) => {
    if (files.length === 0) return;

    setIsUploading(true);
    if (onUploadStart) onUploadStart();

    try {
      // Сжимаем все файлы
      const compressedPhotos = await Promise.all(
        Array.from(files).map(async (file) => {
          const options = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
            fileType: 'image/jpeg',
          };
          const compressedFile = await imageCompression(file, options);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(compressedFile);
          });
        })
      );

      const updatedPhotos = [...photos, ...compressedPhotos];
      setPhotos(updatedPhotos);
      if (onPhotosChange) {
        onPhotosChange(updatedPhotos);
      }
    } catch (error) {
      console.error('Ошибка сжатия фото:', error);
      alert('Не удалось обработать фотографии');
    } finally {
      setIsUploading(false);
      if (onUploadComplete) onUploadComplete();
    }
  };

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleCameraCapture = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isUploading}
      />

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
        <div className="photo-uploading-status">⏳ Обработка фотографий...</div>
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