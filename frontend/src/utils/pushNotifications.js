/**
 * Утилиты для работы с push-уведомлениями
 */

let vapidPublicKey = '';

/**
 * Получить публичный VAPID ключ с сервера
 */
export async function getVapidPublicKey() {
    if (vapidPublicKey) {
        return vapidPublicKey;
    }
    
    try {
        const response = await fetch('/api/push/vapid_public_key');
        const data = await response.json();
        if (data.public_key) {
            vapidPublicKey = data.public_key;
            return vapidPublicKey;
        }
        throw new Error('VAPID ключ не получен');
    } catch (err) {
        console.error('[Push] Ошибка получения VAPID ключа:', err);
        return null;
    }
}

/**
 * Проверить, поддерживает ли браузер push-уведомления
 */
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Получить разрешение на уведомления
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  return await Notification.requestPermission();
}

/**
 * Зарегистрировать service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker не поддерживается');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service Worker зарегистрирован:', registration);
    return registration;
  } catch (err) {
    console.error('[Push] Ошибка регистрации Service Worker:', err);
    return null;
  }
}

/**
 * Подписаться на push-уведомления
 */
export async function subscribeToPush(userName) {
  if (!isPushSupported()) {
    console.warn('[Push] Push-уведомления не поддерживаются');
    return null;
  }
  
  try {
    // Проверяем разрешение
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Разрешение на уведомления не получено');
      return null;
    }
    
    // Регистрируем service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return null;
    }
    
    // Проверяем, есть ли уже подписка
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Уже есть подписка:', subscription);
      return subscription;
    }
    
    // Получаем VAPID ключ с сервера
    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
        console.error('[Push] Не удалось получить VAPID ключ');
        return null;
    }

    // Создаем новую подписку
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });
    
    console.log('[Push] Создана подписка:', subscription);
    
    // Отправляем подписку на сервер
    await saveSubscription(userName, subscription);
    
    return subscription;
  } catch (err) {
    console.error('[Push] Ошибка подписки:', err);
    return null;
  }
}

/**
 * Отписаться от push-уведомлений
 */
export async function unsubscribeFromPush(userName) {
  if (!isPushSupported()) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Отправляем запрос на сервер для удаления подписки
      await deleteSubscription(userName, subscription.endpoint);
      
      // Отписываемся в браузере
      const result = await subscription.unsubscribe();
      console.log('[Push] Отписка:', result);
      return result;
    }
    
    return true;
  } catch (err) {
    console.error('[Push] Ошибка отписки:', err);
    return false;
  }
}

/**
 * Сохранить подписку на сервере
 */
async function saveSubscription(userName, subscription) {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_name: userName,
        subscription: subscription.toJSON(),
      }),
    });
    
    if (!response.ok) {
      throw new Error('Ошибка сохранения подписки');
    }
    
    console.log('[Push] Подписка сохранена на сервере');
    return true;
  } catch (err) {
    console.error('[Push] Ошибка сохранения подписки:', err);
    return false;
  }
}

/**
 * Удалить подписку на сервере
 */
async function deleteSubscription(userName, endpoint) {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_name: userName,
        endpoint: endpoint,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Ошибка удаления подписки');
    }
    
    console.log('[Push] Подписка удалена с сервера');
    return true;
  } catch (err) {
    console.error('[Push] Ошибка удаления подписки:', err);
    return false;
  }
}

/**
 * Конвертировать base64 в Uint8Array для VAPID ключа
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Проверить, включены ли push-уведомления в настройках
 */
export async function isPushEnabled(userName) {
  try {
    const response = await fetch(`/api/users/settings?user_name=${encodeURIComponent(userName)}`);
    const settings = await response.json();
    return settings.push_enabled !== false;
  } catch (err) {
    console.error('[Push] Ошибка проверки настроек:', err);
    return true;
  }
}

/**
 * Обработка клика по уведомлению в приложении
 */
export function handleNotificationClick(taskId) {
  // Если есть task_id, открываем модалку с задачей
  if (taskId) {
    // Диспатчим событие для открытия модалки
    window.dispatchEvent(new CustomEvent('open-task-from-push', {
      detail: { task_id: taskId },
    }));
  }
}