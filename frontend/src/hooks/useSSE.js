import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/api';

export function useSSE(userName, onMessage) {
  const [status, setStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[SSE] Event:', data.type, data);
      
      if (onMessage && typeof onMessage === 'function') {
        onMessage(data);
      }
    } catch (err) {
      console.error('[SSE] Parse error:', err);
    }
  }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Если уже есть соединение - закрываем его
    if (eventSourceRef.current) {
      console.log('[SSE] Closing existing connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!userName) {
      console.log('[SSE] No userName, skipping');
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
      
      // Сбрасываем таймер переподключения
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    es.onmessage = handleMessage;

    es.onerror = (err) => {
      if (!mountedRef.current) return;
      
      console.log('[SSE] Error:', err, 'readyState:', es.readyState);
      
      if (es.readyState === EventSource.CLOSED) {
        setStatus('disconnected');
        setIsConnected(false);
        
        // Пытаемся переподключиться через 3 секунды
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && !eventSourceRef.current) {
            console.log('[SSE] Reconnecting...');
            // Перезапускаем эффект
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
  }, [userName, handleMessage]);

  return { status, isConnected };
}