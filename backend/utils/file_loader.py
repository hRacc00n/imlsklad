import json
import os

def load_json(filename):
    """Загружает данные из JSON файла в папке data"""
    base_dir = os.path.dirname(os.path.dirname(__file__))
    file_path = os.path.join(base_dir, 'data', filename)
    
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_json(filename, data):
    """Сохраняет данные в JSON файл в папке data"""
    base_dir = os.path.dirname(os.path.dirname(__file__))
    file_path = os.path.join(base_dir, 'data', filename)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
