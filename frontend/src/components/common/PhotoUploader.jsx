import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import './PhotoUploader.css';

function PhotoUploader({ onPhotosChange, existingPhotos = [] }) {
  const [photos, setPhotos] = useState(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const compressedPhotos = await Promise.all(
        files.map(async (file) => {
          // Настройки сжатия
          const options = {
            maxSizeMB: 0.5, // максимум 500KB
            maxWidthOrHeight: 1024,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);
          return compressedFile;
        })
      );

      // Преобразуем в base64 для превью
      const photoUrls = await Promise.all(
        compressedPhotos.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        })
      );

      const newPhotos = [...photos, ...photoUrls];
      setPhotos(newPhotos);
      onPhotosChange(newPhotos);
    } catch (err) {
      console.error('Ошибка при сжатии фото:', err);
      alert('Не удалось обработать фотографии');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="photo-uploader">
      <div className="photo-uploader-actions">
        <button
          type="button"
          className="photo-upload-btn"
          onClick={triggerFileInput}
          disabled={uploading}
        >
          📁 Загрузить с компьютера
        </button>
        <button
          type="button"
          className="photo-camera-btn"
          onClick={triggerCamera}
          disabled={uploading}
        >
          📷 Сделать фото
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {uploading && <span className="photo-uploading">⏳ Сжатие...</span>}
      </div>

      {photos.length > 0 && (
        <div className="photo-preview-grid">
          {photos.map((photo, index) => (
            <div key={index} className="photo-preview-item">
              <img src={photo} alt={`Фото ${index + 1}`} className="photo-preview-img" />
              <button
                type="button"
                className="photo-remove-btn"
                onClick={() => removePhoto(index)}
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