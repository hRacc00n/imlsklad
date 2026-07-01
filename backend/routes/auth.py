from flask import request, jsonify
from services.user_service import find_user_by_login_and_password
import json

def register_auth_routes(app):
    @app.route('/api/login', methods=['POST'])
    def login():
        """Авторизация пользователя"""
        data = request.get_json()
        login = data.get('login')
        password = data.get('password')
        
        user = find_user_by_login_and_password(login, password)
        
        if user:
            return json.dumps({
                'success': True,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'login': user['login'],
                    'role': user.get('role', 'user')
                }
            }, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
        
        return json.dumps({
            'success': False,
            'message': 'Неверный логин или пароль'
        }, ensure_ascii=False), 401, {'Content-Type': 'application/json; charset=utf-8'}
