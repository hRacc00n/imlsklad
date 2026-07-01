from flask import request, jsonify
from services.user_service import get_all_users, save_users, find_user_by_id
import json

def register_users_routes(app):
    
    @app.route('/api/users', methods=['GET'])
    def get_users():
        """Получить всех пользователей"""
        users = get_all_users()
        # Скрываем пароли при отправке
        for user in users:
            user.pop('password', None)
        return json.dumps(users, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
    
    @app.route('/api/users', methods=['POST'])
    def create_user():
        """Создать нового пользователя"""
        data = request.get_json()
        users = get_all_users()
        
        # Проверка на существование логина
        for user in users:
            if user['login'] == data['login']:
                return json.dumps({
                    'success': False,
                    'message': 'Пользователь с таким логином уже существует'
                }, ensure_ascii=False), 400, {'Content-Type': 'application/json; charset=utf-8'}
        
        # Новый ID
        new_id = max([u['id'] for u in users]) + 1 if users else 1
        
        new_user = {
            'id': new_id,
            'name': data['name'],
            'login': data['login'],
            'password': data['password'],
            'role': data.get('role', 'logist')
        }
        
        users.append(new_user)
        save_users(users)
        
        # Возвращаем без пароля
        response_user = new_user.copy()
        response_user.pop('password', None)
        
        return json.dumps({
            'success': True,
            'user': response_user
        }, ensure_ascii=False), 201, {'Content-Type': 'application/json; charset=utf-8'}
    
    @app.route('/api/users/<int:user_id>', methods=['PUT'])
    def update_user(user_id):
        """Обновить пользователя"""
        data = request.get_json()
        users = get_all_users()
        
        for i, user in enumerate(users):
            if user['id'] == user_id:
                # Обновляем поля
                if 'name' in data:
                    users[i]['name'] = data['name']
                if 'login' in data:
                    # Проверка на уникальность логина
                    for other_user in users:
                        if other_user['id'] != user_id and other_user['login'] == data['login']:
                            return json.dumps({
                                'success': False,
                                'message': 'Логин уже используется'
                            }, ensure_ascii=False), 400, {'Content-Type': 'application/json; charset=utf-8'}
                    users[i]['login'] = data['login']
                if 'password' in data and data['password']:
                    users[i]['password'] = data['password']
                if 'role' in data:
                    users[i]['role'] = data['role']
                
                save_users(users)
                
                response_user = users[i].copy()
                response_user.pop('password', None)
                
                return json.dumps({
                    'success': True,
                    'user': response_user
                }, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
        
        return json.dumps({
            'success': False,
            'message': 'Пользователь не найден'
        }, ensure_ascii=False), 404, {'Content-Type': 'application/json; charset=utf-8'}
    
    @app.route('/api/users/<int:user_id>', methods=['DELETE'])
    def delete_user(user_id):
        """Удалить пользователя"""
        users = get_all_users()
        
        for i, user in enumerate(users):
            if user['id'] == user_id:
                # Нельзя удалить самого себя (опционально)
                # Проверка через заголовок или тело запроса
                deleted_user = users.pop(i)
                save_users(users)
                
                return json.dumps({
                    'success': True,
                    'message': f'Пользователь {deleted_user["name"]} удалён'
                }, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
        
        return json.dumps({
            'success': False,
            'message': 'Пользователь не найден'
        }, ensure_ascii=False), 404, {'Content-Type': 'application/json; charset=utf-8'}