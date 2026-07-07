// taskActions.js

/**
 * Проверяет, может ли пользователь взять задачу
 */
export const canTakeTask = (user, task) => {
  if (!user || !task) return false;
  // Только новые задачи может взять любой пользователь
  return task.status === 'new';
};

/**
 * Проверяет, может ли пользователь выполнить задачу
 */
export const canCompleteTask = (user, task) => {
  if (!user || !task) return false;
  // Только пользователь, у которого задача в работе, может выполнить
  return task.status === 'in_progress' && task.assigned_to === user.name;
};

/**
 * Проверяет, может ли пользователь отказаться от задачи
 */
export const canDeclineTask = (user, task) => {
  if (!user || !task) return false;
  // Только пользователь, у которого задача в работе, может отказаться
  return task.status === 'in_progress' && task.assigned_to === user.name;
};

/**
 * Проверяет, может ли пользователь переназначить задачу на себя
 */
export const canReassignTask = (user, task) => {
  if (!user || !task) return false;
  // Если задача в работе у другого пользователя
  return task.status === 'in_progress' && 
         task.assigned_to !== user.name && 
         task.assigned_to !== null;
};

/**
 * Получить доступные действия для задачи
 */
export const getAvailableActions = (user, task) => {
  return {
    canTake: canTakeTask(user, task),
    canComplete: canCompleteTask(user, task),
    canDecline: canDeclineTask(user, task),
    canReassign: canReassignTask(user, task),
  };
};