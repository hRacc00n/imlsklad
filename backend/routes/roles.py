from flask import request, jsonify
from services.roles_service import get_all_roles, save_roles, find_role_by_id, find_role_by_key
import json

def register_roles_routes(app):
    
    @app.route('/api/roles', methods=['GET'])
    def get_roles():
        """Получить все роли"""
        roles = get_all_roles()
        return json.dumps(roles, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
    
    @app.route('/api/roles', methods=['POST'])
    def create_role():
        """Создать новую роль"""
        data = request.get_json()
        roles = get_all_roles()
        
        # Проверка на существование role_key
        existing = find_role_by_key(data.get('role_key', ''))
        if existing:
            return json.dumps({
                'success': False,
                'message': 'Роль с таким ключом уже существует'
            }, ensure_ascii=False), 400, {'Content-Type': 'application/json; charset=utf-8'}
        
        # Проверка на существование имени
        for role in roles:
            if role['name'] == data['name']:
                return json.dumps({
                    'success': False,
                    'message': 'Роль с таким именем уже существует'
                }, ensure_ascii=False), 400, {'Content-Type': 'application/json; charset=utf-8'}
        
        # Новый ID
        new_id = max([r['id'] for r in roles]) + 1 if roles else 1
        
        new_role = {
            'id': new_id,
            'name': data['name'],
            'role_key': data.get('role_key', ''),
            'hub_access': data.get('hub_access', [])  # массив ID хабов
        }
        
        roles.append(new_role)
        save_roles(roles)
        
        return json.dumps({
            'success': True,
            'role': new_role
        }, ensure_ascii=False), 201, {'Content-Type': 'application/json; charset=utf-8'}
    
    @app.route('/api/roles/<int:role_id>', methods=['PUT'])
    def update_role(role_id):
        """Обновить роль"""
        data = request.get_json()
        roles = get_all_roles()
        
        for i, role in enumerate(roles):
            if role['id'] == role_id:
                # Обновляем поля
                if 'name' in data:
                    # Проверка на уникальность имени
                    for other in roles:
                        if other['id'] != role_id and other['name'] == data['name']:
                            return json.dumps({
                                'success': False,
                                'message': 'Роль с таким именем уже существует'
                            }, ensure_ascii=False), 400, {'Content-Type': 'application/json; charset=utf-8'}
                    roles[i]['name'] = data['name']
                
                if 'role_key' in data:
                    # Проверка на уникальность ключа
                    for other in roles:
                        if other['id'] != role_id and other.get('role_key') == data['role_key']:
                            return json.dumps({
                                'success': False,
                                'message': 'Роль с таким ключом уже существует'
                            }, ensure_ascii=False), 400, {'Content-Type': 'application/json; charset=utf-8'}
                    roles[i]['role_key'] = data['role_key']
                
                if 'description' in data:
                    roles[i]['description'] = data['description']
                
                if 'hub_access' in data:
                    roles[i]['hub_access'] = data['hub_access']
                
                save_roles(roles)
                
                return json.dumps({
                    'success': True,
                    'role': roles[i]
                }, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
        
        return json.dumps({
            'success': False,
            'message': 'Роль не найдена'
        }, ensure_ascii=False), 404, {'Content-Type': 'application/json; charset=utf-8'}
    
    @app.route('/api/roles/<int:role_id>', methods=['DELETE'])
    def delete_role(role_id):
        """Удалить роль"""
        roles = get_all_roles()
        
        # Нельзя удалить роль admin
        role_to_delete = find_role_by_id(role_id)
        if role_to_delete and role_to_delete.get('role_key') == 'admin':
            return json.dumps({
                'success': False,
                'message': 'Нельзя удалить роль Администратора'
            }, ensure_ascii=False), 400, {'Content-Type': 'application/json; charset=utf-8'}
        
        for i, role in enumerate(roles):
            if role['id'] == role_id:
                deleted = roles.pop(i)
                save_roles(roles)
                return json.dumps({
                    'success': True,
                    'message': f'Роль "{deleted["name"]}" удалена'
                }, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
        
        return json.dumps({
            'success': False,
            'message': 'Роль не найдена'
        }, ensure_ascii=False), 404, {'Content-Type': 'application/json; charset=utf-8'}

    @app.route('/api/hubs', methods=['GET'])
    def get_hubs():
        """Получить список всех хабов"""
        from utils.file_loader import load_json
        hubs = load_json('hubs.json')
        return json.dumps(hubs, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}