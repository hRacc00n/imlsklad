import { useState, useEffect } from 'react';
import PhotoUploader from '../common/PhotoUploader';
import ActionButton from '../common/ActionButton';
import './HubTaskFormModal.css';

function HubTaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Создать',
  fields = [],
  initialValues = {},
  initialPhotos = [],
  submitLabel = 'Создать',
  isSubmitting = false,
  isPhotosUploading = false,
  onPhotoUploadStart,
  onPhotoUploadComplete,
}) {
  const [values, setValues] = useState(initialValues);
  const [photos, setPhotos] = useState(initialPhotos);
  const [errors, setErrors] = useState({});

  // Сброс формы при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setPhotos(initialPhotos);
      setErrors({});
    }
  }, [isOpen, initialValues, initialPhotos]);

  if (!isOpen) return null;

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhotosChange = (newPhotos) => {
    setPhotos(newPhotos);
    if (errors.photos) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.photos;
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      if (field.required) {
        const value = values[field.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field.name] = 'Это поле обязательно';
        }
      }
      
      if (field.type === 'photos' && field.required && photos.length === 0) {
        newErrors[field.name] = 'Добавьте хотя бы одну фотографию';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(values, photos);
  };

  const renderField = (field) => {
    const value = values[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'text':
        return (
          <div className="hub-form-group" key={field.name}>
            <label>
              {field.label} {field.required && <span className="hub-form-required">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
            {error && <div className="hub-form-error">{error}</div>}
          </div>
        );

      case 'textarea':
        return (
          <div className="hub-form-group" key={field.name}>
            <label>
              {field.label} {field.required && <span className="hub-form-required">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows || 4}
              required={field.required}
            />
            {error && <div className="hub-form-error">{error}</div>}
          </div>
        );

      case 'photos':
        return (
          <div className="hub-form-group" key={field.name}>
            <label>
              {field.label} {field.required && <span className="hub-form-required">*</span>}
            </label>
            <PhotoUploader
              onPhotosChange={handlePhotosChange}
              existingPhotos={photos}
              onUploadStart={onPhotoUploadStart}
              onUploadComplete={onPhotoUploadComplete}
            />
            {!isPhotosUploading && photos.length === 0 && (
              <div className="hub-form-hint hub-form-hint-error">
                ⚠️ Добавьте хотя бы одну фотографию
              </div>
            )}
            {isPhotosUploading && (
              <div className="hub-form-hint hub-form-hint-loading">
                ⏳ Загрузка фотографий...
              </div>
            )}
            {!isPhotosUploading && photos.length > 0 && (
              <div className="hub-form-hint hub-form-hint-success">
                ✅ Загружено {photos.length} фото
              </div>
            )}
            {error && <div className="hub-form-error">{error}</div>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="hub-modal-overlay" onClick={onClose}>
      <div className="hub-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-header">
          <h2>{title}</h2>
          <button className="hub-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="hub-modal-body">
          {fields.map(renderField)}
          <div className="hub-modal-footer">
            <button
              type="button"
              className="hub-btn-cancel"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="hub-btn-submit"
              disabled={isSubmitting || isPhotosUploading || (fields.some(f => f.type === 'photos' && f.required) && photos.length === 0)}
            >
              {isSubmitting ? 'Создание...' : isPhotosUploading ? 'Загрузка фото...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HubTaskFormModal;