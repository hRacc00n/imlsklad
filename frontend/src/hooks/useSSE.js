import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '../utils/api';

export function useSSE(userName, onMessage) {
  const [status, setStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!userName) {
      return;
    }

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/events/stream?client_id=${clientId}&user=${encodeURIComponent(userName)}`;
    
    console.log('[SSE] Connecting to:', url);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[SSE] Connected ✅');
      setStatus('connected');
      setIsConnected(true);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Received:', data);
        
        // Вызываем колбэк для любого сообщения
        if (onMessage) {
          onMessage(data);
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    es.onerror = (err) => {
      if (!mountedRef.current) return;
      
      console.log('[SSE] Error:', err, 'readyState:', es.readyState);
      
      if (es.readyState === EventSource.CLOSED) {
        setStatus('disconnected');
        setIsConnected(false);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            console.log('[SSE] Reconnecting...');
            // Пересоздаём соединение
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            // Повторно запускаем эффект через обновление состояния
            setStatus('reconnecting');
          }
        }, 3000);
      }
    };

    return () => {
      mountedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (eventSourceRef.current) {
        console.log('[SSE] Closing connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setStatus('disconnected');
        setIsConnected(false);
      }
    };
  }, [userName]);

  return { status, isConnected };
}