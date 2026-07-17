import { useState, useRef, useEffect } from 'react';
import './FileUploader.css';

function FileUploader({ onFilesChange, existingFiles = [], onUploadStart, onUploadComplete }) {
  const [files, setFiles] = useState(existingFiles);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFiles(existingFiles);
  }, [existingFiles]);

  const processFiles = async (fileList) => {
    if (fileList.length === 0) return;

    setIsUploading(true);
    if (onUploadStart) onUploadStart();

    try {
      const newFiles = [];
      
      for (const file of fileList) {
        // Проверяем размер файла (максимум 20MB)
        if (file.size > 20 * 1024 * 1024) {
          alert(`Файл "${file.name}" слишком большой (${(file.size / 1024 / 1024).toFixed(1)}MB). Максимальный размер - 20MB.`);
          continue;
        }

        // Читаем файл как base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        });

        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64,
        });
      }

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      if (onFilesChange) {
        onFilesChange(updatedFiles);
      }
    } catch (error) {
      console.error('Ошибка обработки файлов:', error);
      alert('Не удалось обработать файлы');
    } finally {
      setIsUploading(false);
      if (onUploadComplete) onUploadComplete();
    }
  };

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'ppt': '📑',
      'pptx': '📑',
      'txt': '📃',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
      'zip': '📦',
      'rar': '📦',
      '7z': '📦',
    };
    return icons[ext] || '📎';
  };

  return (
    <div className="file-uploader">
      <div className="file-uploader-actions">
        <button
          type="button"
          className="file-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <span className="btn-icon">📎</span>
          Загрузить файлы
        </button>
        <span className="file-upload-hint">(макс. 20MB каждый)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      {isUploading && (
        <div className="file-uploading-status">⏳ Обработка файлов...</div>
      )}

      {files.length > 0 && (
        <div className="file-uploader-preview">
          {files.map((file, index) => (
            <div key={index} className="file-uploader-item">
              <span className="file-icon">{getFileIcon(file.name)}</span>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
              <button
                className="file-remove-btn"
                onClick={() => handleRemoveFile(index)}
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

export default FileUploader;