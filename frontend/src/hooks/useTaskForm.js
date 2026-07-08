import { useState, useCallback } from 'react';

/**
 * Хук для управления формой задачи
 * @param {Object} config - конфигурация
 * @param {Array} config.fields - поля формы
 * @param {Object} config.initialValues - начальные значения
 * @param {Function} config.onSubmit - обработчик отправки
 */
export function useTaskForm(config = {}) {
  const {
    fields = [],
    initialValues = {},
    onSubmit = null,
  } = config;

  const [values, setValues] = useState(initialValues);
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  /**
   * Обновить значение поля
   */
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Очищаем ошибку для этого поля
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Обновить фотографии
   */
  const handlePhotosChange = useCallback((newPhotos) => {
    setPhotos(newPhotos);
  }, []);

  /**
   * Валидация формы
   */
  const validate = useCallback(() => {
    const newErrors = {};
    
    fields.forEach(field => {
      if (field.required) {
        const value = values[field.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field.name] = 'Это поле обязательно';
        }
      }
      
      // Специальная валидация для фото
      if (field.type === 'photos' && field.required) {
        if (photos.length === 0) {
          newErrors[field.name] = 'Добавьте хотя бы одну фотографию';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, values, photos]);

  /**
   * Сброс формы
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setPhotos([]);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Отправка формы
   */
  const submit = useCallback(async () => {
    if (!validate()) return false;
    
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(values, photos);
      }
      return true;
    } catch (err) {
      console.error('[useTaskForm] Ошибка:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, values, photos, onSubmit]);

  /**
   * Заполнить форму данными (для редактирования)
   */
  const fill = useCallback((data, existingPhotos = []) => {
    setValues(data);
    setPhotos(existingPhotos);
  }, []);

  return {
    // Данные
    values,
    photos,
    errors,
    isSubmitting,
    
    // Методы
    handleChange,
    handlePhotosChange,
    validate,
    submit,
    reset,
    fill,
  };
}

export default useTaskForm;