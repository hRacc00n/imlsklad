import './FileList.css';

function FileList({ files, onView, onDownload }) {
  if (!files || files.length === 0) {
    return <div className="file-list-empty">Нет файлов</div>;
  }

  // Определяем иконку по расширению
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const handleDownload = (file) => {
    // Создаем ссылку для скачивания
    const url = file.path.startsWith('/') ? file.path : `/${file.path}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name; // Указываем имя файла для скачивания
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="file-list">
      <div className="file-list-header">
        <span>Список файлов ({files.length})</span>
      </div>
      <div className="file-list-items">
        {files.map((file, index) => (
          <div key={index} className="file-list-item">
            <div className="file-info">
              <span className="file-icon">{getFileIcon(file.name)}</span>
              <span className="file-name" title={file.name}>
                {file.name}
              </span>
            </div>
            <div className="file-actions">
              {onView && (
                <button
                  className="file-action-btn view"
                  onClick={() => onView(file)}
                  title="Посмотреть"
                >
                  👁️ Посмотреть
                </button>
              )}
              <button
                className="file-action-btn download"
                onClick={() => handleDownload(file)}
                title="Скачать"
              >
                ⬇️ Скачать
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileList;