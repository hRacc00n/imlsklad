// Универсальный базовый URL для API
export const getApiBaseUrl = () => {
  // Если мы на сервере — используем относительный путь
  if (window.location.hostname === 'imlsklad.ru' || window.location.hostname === 'www.imlsklad.ru') {
    return '';
  }
  // Если локально — используем localhost:5000
  return 'http://localhost:5000';
};

// Универсальный axios (или fetch) с правильным baseURL
export const apiFetch = (url, options = {}) => {
  const baseUrl = getApiBaseUrl();
  return fetch(`${baseUrl}${url}`, options);
};