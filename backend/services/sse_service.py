# backend/services/sse_service.py
import queue
import time
from threading import Lock

class SSEService:
    def __init__(self):
        self.clients = {}
        self.lock = Lock()
        self.max_clients = 100
    
    def add_client(self, client_id, queue_obj=None, user=None, ip=None):
        with self.lock:
            # Проверяем, есть ли уже соединение от этого пользователя
            existing_client = None
            for cid, data in self.clients.items():
                if data.get('user') == user and data.get('ip') == ip:
                    existing_client = cid
                    break
            
            # Если есть существующее соединение - закрываем его
            if existing_client:
                print(f"[SSE] Closing duplicate connection for {user} (ID: {existing_client})")
                try:
                    self.clients[existing_client]['queue'].put({'type': 'close'})
                except:
                    pass
                del self.clients[existing_client]
            
            if len(self.clients) >= self.max_clients:
                return None
            
            if queue_obj is None:
                queue_obj = queue.Queue()
            
            self.clients[client_id] = {
                'queue': queue_obj,
                'user': user,
                'ip': ip,
                'connected_at': time.time()
            }
            return queue_obj
    
    def remove_client(self, client_id):
        with self.lock:
            if client_id in self.clients:
                del self.clients[client_id]
                return True
            return False
    
    def broadcast(self, message):
        """Отправить сообщение всем клиентам"""
        with self.lock:
            for client_id, client_data in list(self.clients.items()):
                try:
                    client_data['queue'].put(message)
                except:
                    self.remove_client(client_id)
    
    def get_all_connections(self):
        """Получить список всех подключений"""
        with self.lock:
            return [
                {
                    'client_id': client_id,
                    'user': data['user'],
                    'ip': data['ip'],
                    'connected_at': data['connected_at']
                }
                for client_id, data in self.clients.items()
            ]
    
    def close_connection(self, client_id):
        """Принудительно закрыть соединение"""
        with self.lock:
            if client_id in self.clients:
                try:
                    self.clients[client_id]['queue'].put({'type': 'close'})
                except:
                    pass
                return True
            return False

# Создаем глобальный экземпляр
sse_service = SSEService()