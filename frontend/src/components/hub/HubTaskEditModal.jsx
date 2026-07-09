import { useState, useEffect } from 'react';
import PhotoUploader from '../common/PhotoUploader';
import ActionButton from '../common/ActionButton';
import './HubTaskFormModal.css';

function HubTaskEditModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  fields = [],
  isSubmitting = false,
  isPhotosUploading = false,
  onPhotoUploadStart,
  onPhotoUploadComplete,
}) {
  const [values, setValues] = useState({});
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});

  // Заполняем форму данными задачи при открытии
  useEffect(() => {
    if (isOpen && task) {
      const initialValues = {};
      fields.forEach(field => {
        if (field.name === 'supplier') {
          initialValues[field.name] = task.supplier || '';
        } else if (field.name === 'comment') {
          initialValues[field.name] = task.comment || '';
        } else {
          initialValues[field.name] = task[field.name] || '';
        }
      });
      setValues(initialValues);
      setPhotos(task.photos || []);
      setErrors({});
    }
  }, [isOpen, task, fields]);

  if (!isOpen || !task) return null;

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
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(task.id, values, photos);
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
            />
            {error && <div className="hub-form-error">{error}</div>}
          </div>
        );

      case 'photos':
        return (
          <div className="hub-form-group" key={field.name}>
            <label>{field.label}</label>
            <PhotoUploader
              onPhotosChange={handlePhotosChange}
              existingPhotos={photos}
              onUploadStart={onPhotoUploadStart}
              onUploadComplete={onPhotoUploadComplete}
            />
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
          <h2>✏️ Редактировать задачу</h2>
          <button className="hub-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="hub-modal-body">
          {fields.map(renderField)}
          <div className="hub-modal-footer">
            <button type="button" className="hub-btn-cancel" onClick={onClose}>
              Отмена
            </button>
            <button
              type="submit"
              className="hub-btn-submit"
              disabled={isSubmitting || isPhotosUploading}
            >
              {isSubmitting ? 'Сохранение...' : isPhotosUploading ? 'Загрузка фото...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HubTaskEditModal;