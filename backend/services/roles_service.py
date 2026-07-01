from utils.file_loader import load_json, save_json

def get_all_roles():
    """Получить все роли"""
    return load_json('roles.json')

def save_roles(roles):
    """Сохранить роли"""
    save_json('roles.json', roles)

def find_role_by_id(role_id):
    """Найти роль по ID"""
    roles = get_all_roles()
    for role in roles:
        if role['id'] == role_id:
            return role
    return None

def find_role_by_key(role_key):
    """Найти роль по ключу"""
    roles = get_all_roles()
    for role in roles:
        if role.get('role_key') == role_key:
            return role
    return None