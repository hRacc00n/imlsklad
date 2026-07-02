import { useEffect, useRef, useState } from 'react';

export function useSSE(userName) {
  const [status, setStatus] = useState('disconnected');
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    // Передаём имя пользователя в URL
    const url = `http://localhost:5000/api/events/stream?client_id=${clientId}&user=${encodeURIComponent(userName)}`;
    
    console.log('[SSE] Connecting to:', url);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[SSE] Connected ✅');
      setStatus('connected');
    };

    es.onmessage = (event) => {
      console.log('[SSE] Message:', event.data);
    };

    es.onerror = (err) => {
      console.log('[SSE] Error:', err, 'readyState:', es.readyState);
      if (es.readyState === EventSource.CLOSED) {
        setStatus('disconnected');
      }
    };

    return () => {
      console.log('[SSE] Closing connection');
      es.close();
    };
  }, [userName]);

  return { status, isConnected: status === 'connected' };
}