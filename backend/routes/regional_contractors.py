from flask import request, jsonify
from utils.file_loader import load_json, save_json

def register_regional_contractors_routes(app):
    
    @app.route('/api/regional-contractors', methods=['GET'])
    def get_regional_contractors():
        """Получить список региональных контрагентов"""
        try:
            data = load_json('regional_contractors.json')
            if isinstance(data, dict) and 'contractors' in data:
                return jsonify(data['contractors']), 200
            return jsonify([]), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/regional-contractors', methods=['POST'])
    def add_regional_contractor():
        """Добавить контрагента в список"""
        try:
            data = request.get_json()
            contractor = data.get('contractor', '').strip()
            
            if not contractor:
                return jsonify({'error': 'Название контрагента обязательно'}), 400
            
            file_data = load_json('regional_contractors.json')
            if isinstance(file_data, dict) and 'contractors' in file_data:
                contractors = file_data['contractors']
            else:
                contractors = []
            
            if contractor in contractors:
                return jsonify({'error': 'Контрагент уже есть в списке'}), 400
            
            contractors.append(contractor)
            file_data['contractors'] = contractors
            save_json('regional_contractors.json', file_data)
            
            return jsonify({'success': True, 'contractors': contractors}), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/regional-contractors/<int:index>', methods=['DELETE'])
    def delete_regional_contractor(index):
        """Удалить контрагента из списка по индексу"""
        try:
            file_data = load_json('regional_contractors.json')
            if not isinstance(file_data, dict) or 'contractors' not in file_data:
                return jsonify({'error': 'Список пуст'}), 400
            
            contractors = file_data['contractors']
            
            if index < 0 or index >= len(contractors):
                return jsonify({'error': 'Индекс вне диапазона'}), 400
            
            deleted = contractors.pop(index)
            file_data['contractors'] = contractors
            save_json('regional_contractors.json', file_data)
            
            return jsonify({'success': True, 'deleted': deleted, 'contractors': contractors}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/regional-contractors/<int:index>', methods=['PUT'])
    def update_regional_contractor(index):
        """Обновить контрагента в списке по индексу"""
        try:
            data = request.get_json()
            new_name = data.get('contractor', '').strip()
            
            if not new_name:
                return jsonify({'error': 'Название контрагента обязательно'}), 400
            
            file_data = load_json('regional_contractors.json')
            if not isinstance(file_data, dict) or 'contractors' not in file_data:
                return jsonify({'error': 'Список пуст'}), 400
            
            contractors = file_data['contractors']
            
            if index < 0 or index >= len(contractors):
                return jsonify({'error': 'Индекс вне диапазона'}), 400
            
            if new_name in contractors and contractors[index] != new_name:
                return jsonify({'error': 'Контрагент с таким именем уже есть'}), 400
            
            old_name = contractors[index]
            contractors[index] = new_name
            file_data['contractors'] = contractors
            save_json('regional_contractors.json', file_data)
            
            return jsonify({
                'success': True, 
                'old_name': old_name, 
                'new_name': new_name, 
                'contractors': contractors
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500