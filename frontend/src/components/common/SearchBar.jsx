import { useState, useCallback, useEffect, useRef } from 'react';
import './SearchBar.css';

function SearchBar({ onSearch, placeholder = 'Поиск...', debounceMs = 300 }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Дебаунс для автоматического поиска при вводе
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  const handleSearch = () => {
    onSearch(query);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(query);
    }
    if (e.key === 'Escape') {
      setQuery('');
      onSearch('');
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className={`search-bar ${isFocused ? 'search-bar-focused' : ''}`}>
      <span className="search-icon">🔍</span>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
      />
      {query.length > 0 && (
        <button className="search-clear" onClick={handleClear} title="Очистить">
          ✕
        </button>
      )}
      <button className="search-submit" onClick={handleSearch} title="Найти">
        🔍
      </button>
    </div>
  );
}

export default SearchBar;