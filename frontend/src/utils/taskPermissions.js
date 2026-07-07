// taskPermissions.js

/**
 * Проверяет, может ли пользователь редактировать задачу
 * @param {Object} user - текущий пользователь
 * @param {Object} task - задача
 * @returns {boolean}
 */
export const canEditTask = (user, task) => {
  if (!user || !task) return false;
  
  // Администратор может редактировать всё
  if (user.role === 'admin') return true;
  
  // Автор задачи может редактировать только свои задачи
  return user.name === task.author || user.login === task.author;
};

/**
 * Проверяет, может ли пользователь удалять задачу
 * @param {Object} user - текущий пользователь
 * @param {Object} task - задача
 * @returns {boolean}
 */
export const canDeleteTask = (user, task) => {
  if (!user || !task) return false;
  
  // Администратор может удалять всё
  if (user.role === 'admin') return true;
  
  // Автор задачи может удалять только свои задачи
  return user.name === task.author || user.login === task.author;
};

/**
 * Проверяет, является ли пользователь автором задачи
 * @param {Object} user - текущий пользователь
 * @param {Object} task - задача
 * @returns {boolean}
 */
export const isTaskAuthor = (user, task) => {
  if (!user || !task) return false;
  return user.name === task.author || user.login === task.author;
};