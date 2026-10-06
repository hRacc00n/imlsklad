import { useState, useEffect } from 'react';
import './ReceiptPage.css';

function ReceiptPage() {
  const [formData, setFormData] = useState({
    giver: '',
    source: '',
    comment: '',
  });
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Обработка выбора фото
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newPhotos = [];
    
    for (const file of files) {
      // Проверка размера (макс 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`Файл ${file.name} слишком большой (макс 10MB)`);
        continue;
      }

      // Сжатие изображения
      try {
        const compressed = await compressImage(file);
        newPhotos.push(compressed);
      } catch (err) {
        console.error('Ошибка сжатия:', err);
      }
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    // Очищаем input, чтобы можно было выбрать тот же файл снова
    e.target.value = '';
  };

  // Сжатие изображения через canvas
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Удаление фото
  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.giver.trim()) {
      setError('Укажите, кто сдает');
      return;
    }
    if (!formData.source.trim()) {
      setError('Укажите, откуда');
      return;
    }
    if (photos.length === 0) {
      setError('Прикрепите хотя бы одну фотографию');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tasks/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giver: formData.giver.trim(),
          source: formData.source.trim(),
          comment: formData.comment.trim(),
          photos: photos,
          author: 'Инженер',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setFormData({ giver: '', source: '', comment: '' });
        setPhotos([]);
      } else {
        setError(data.message || 'Ошибка при отправке заявки');
      }
    } catch (err) {
      console.error('Ошибка отправки:', err);
      setError('Ошибка при отправке заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Проверка: можно ли отправлять
  const canSubmit = 
    formData.giver.trim() && 
    formData.source.trim() && 
    photos.length > 0 && 
    !isSubmitting;

  if (success) {
    return (
      <div className="receipt-page">
        <div className="receipt-success">
          <div className="receipt-success-icon">✅</div>
          <h1>Заявка отправлена!</h1>
          <p>Задача на оприходование создана и передана ответственным.</p>
          <button
            className="receipt-btn-new"
            onClick={() => setSuccess(false)}
          >
            Создать ещё одну
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-page">
      <div className="receipt-card">
        <div className="receipt-header">
          <h1>📦 Заявка на оприходование</h1>
          <p className="receipt-subtitle">
            Заполните форму и прикрепите фотографии оборудования
          </p>
        </div>

        <form onSubmit={handleSubmit} className="receipt-form">
          <div className="receipt-form-group">
            <label>Кто сдает *</label>
            <input
              type="text"
              value={formData.giver}
              onChange={(e) => setFormData({ ...formData, giver: e.target.value })}
              placeholder="ФИО инженера"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="receipt-form-group">
            <label>Откуда *</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="Например: Трейлер 109, Краснодарск, Разбор магнита sn: 1111"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="receipt-form-group">
            <label>Комментарий</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Дополнительная информация, местоположение и прочее"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="receipt-form-group">
            <label>Фотографии * ({photos.length})</label>
            
            {photos.length > 0 && (
              <div className="receipt-photos-preview">
                {photos.map((photo, idx) => (
                  <div key={idx} className="receipt-photo-item">
                    <img src={photo} alt={`Фото ${idx + 1}`} />
                    <button
                      type="button"
                      className="receipt-photo-remove"
                      onClick={() => handleRemovePhoto(idx)}
                      disabled={isSubmitting}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <label className="receipt-photo-upload">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                disabled={isSubmitting}
                style={{ display: 'none' }}
              />
              <span className="receipt-photo-upload-btn">
                📷 {photos.length === 0 ? 'Добавить фотографии' : 'Добавить ещё'}
              </span>
            </label>
          </div>

          {error && <div className="receipt-error">{error}</div>}

          <button
            type="submit"
            className="receipt-submit"
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Отправка...' : '📤 Отправить заявку'}
          </button>

          {photos.length === 0 && (
            <p className="receipt-hint">
              * Прикрепите хотя бы одну фотографию для отправки
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ReceiptPage;