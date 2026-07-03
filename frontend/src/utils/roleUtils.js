// Единый источник правды для работы с ролями
export const getRoleLabel = (roleKey, roles = []) => {
  if (!roleKey) return 'Неизвестно';
  
  // Если передан массив ролей — ищем по ключу
  if (roles.length > 0) {
    const found = roles.find(r => r.role_key === roleKey || r.name === roleKey);
    if (found) return found.name;
  }
  
  // Fallback для стандартных ролей (если роли ещё не загружены)
  const roleMap = {
    'admin': 'Администратор',
    'manager': 'Менеджер',
    'logist': 'Логист'
  };
  return roleMap[roleKey] || roleKey;
};

// Получить все роли для выпадающего списка
export const getRoleOptions = (roles) => {
  return roles.map(role => ({
    value: role.role_key || role.name,
    label: role.name
  }));
};