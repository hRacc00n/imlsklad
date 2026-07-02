from queue import Queue
import threading
import time

class SSEService:
    def __init__(self):
        # Храним: client_id -> {queue, user, ip, connected_at}
        self.clients = {}
        self.lock = threading.Lock()
    
    def add_client(self, client_id, response=None, user=None, ip=None):
        with self.lock:
            if client_id in self.clients:
                return self.clients[client_id]['queue']
            
            if len(self.clients) > 100:
                return None
            
            queue = Queue()
            self.clients[client_id] = {
                'queue': queue,
                'user': user or 'Unknown',
                'ip': ip or 'Unknown',
                'connected_at': time.time()
            }
            print(f"[SSE] + Client: {client_id} (user: {user}). Total: {len(self.clients)}")
            return queue
    
    def remove_client(self, client_id):
        with self.lock:
            if client_id in self.clients:
                del self.clients[client_id]
                print(f"[SSE] - Client: {client_id}. Total: {len(self.clients)}")
    
    def get_all_connections(self):
        """Возвращает список всех активных соединений для админ-панели"""
        with self.lock:
            result = []
            for client_id, data in self.clients.items():
                result.append({
                    'client_id': client_id,
                    'user': data.get('user', 'Unknown'),
                    'ip': data.get('ip', 'Unknown'),
                    'connected_at': data.get('connected_at', time.time())
                })
            return result
    
    def close_connection(self, client_id):
        """Принудительно закрывает соединение по client_id"""
        with self.lock:
            if client_id in self.clients:
                del self.clients[client_id]
                print(f"[SSE] 🔒 Force closed: {client_id}. Total: {len(self.clients)}")
                return True
        return False
    
    def broadcast(self, data, exclude_client_id=None):
        with self.lock:
            for cid, client_data in self.clients.items():
                if cid != exclude_client_id:
                    try:
                        client_data['queue'].put(data)
                    except:
                        pass

sse_service = SSEService()