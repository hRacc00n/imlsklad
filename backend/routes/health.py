from flask import jsonify
import json

def register_health_routes(app):
    @app.route('/api/health')
    def health():
        return json.dumps({
            'status': 'ok',
            'message': 'Логистический центр работает'
        }, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
