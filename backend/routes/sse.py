from flask import Response, request
from services.sse_service import sse_service
import json
import time

def register_sse_routes(app):
    
    @app.route('/api/events/stream')
    def sse_stream():
        client_id = request.args.get('client_id', f'unknown_{int(time.time())}')
        user = request.args.get('user', 'Unknown')
        ip = request.remote_addr or 'Unknown'
        
        print(f"[SSE] Connect: {client_id} (user: {user})")
        
        def generate():
            queue = sse_service.add_client(client_id, None, user=user, ip=ip)
            if queue is None:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Too many connections'})}\n\n"
                return
            
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected'})}\n\n"
            
            try:
                while True:
                    try:
                        data = queue.get(timeout=15)
                        yield f"data: {json.dumps(data)}\n\n"
                    except:
                        yield f": keep-alive {time.time()}\n\n"
            except GeneratorExit:
                print(f"[SSE] GeneratorExit: {client_id}")
            except Exception as e:
                print(f"[SSE] Exception: {client_id} - {e}")
            finally:
                print(f"[SSE] Cleaning up: {client_id}")
                sse_service.remove_client(client_id)
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream; charset=utf-8'
            }
        )
    
    # ========== НОВЫЕ ЭНДПОЙНТЫ ДЛЯ АДМИН-ПАНЕЛИ ==========
    
    @app.route('/api/events/stats')
    def sse_stats():
        """Получить список всех активных SSE соединений"""
        connections = sse_service.get_all_connections()
        return {
            'total': len(connections),
            'connections': connections
        }
    
    @app.route('/api/events/close/<client_id>', methods=['POST'])
    def sse_close(client_id):
        """Принудительно закрыть SSE соединение"""
        success = sse_service.close_connection(client_id)
        if success:
            return {'success': True, 'message': f'Соединение {client_id} закрыто'}
        return {'success': False, 'message': 'Соединение не найдено'}, 404
    
    @app.route('/api/events/test', methods=['POST'])
    def sse_test():
        """Тестовый эндпоинт для отправки сообщений всем клиентам"""
        data = request.get_json() or {}
        message = data.get('message', 'Test notification')
        
        sse_service.broadcast({
            'type': 'test',
            'message': message,
            'timestamp': time.time()
        })
        
        return {'success': True, 'message': 'Message sent'}