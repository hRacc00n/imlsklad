// config/hubConfigs.js

/**
 * Типы хабов
 */
export const HUB_TYPES = {
  ARRIVALS: 'arrivals',
  REGIONS: 'regions',
  SPB: 'spb',
  INVOICES: 'invoices',
  AIR_TRAFFIC: 'airtraffic',
  TASKS: 'tasks',
};

/**
 * Конфигурация для каждого хаба
 */
export const hubConfigs = {
  // ============================================
  // Хаб: Поступления
  // ============================================
  [HUB_TYPES.ARRIVALS]: {
    id: 'arrivals',
    title: '📦 Поступление',
    icon: '📦',
    route: '/hub/arrivals',
    
    // API эндпоинты
    api: {
      list: '/api/tasks/arrivals',
      create: '/api/tasks/arrivals',
      update: (id) => `/api/tasks/${id}`,
      delete: (id) => `/api/tasks/${id}`,
      take: (id) => `/api/tasks/${id}/take`,
      complete: (id) => `/api/tasks/${id}/complete`,
      decline: (id) => `/api/tasks/${id}/decline`,
      reassign: (id) => `/api/tasks/${id}/reassign`,
      uploadPhotos: (id) => `/api/tasks/${id}/photos`,
    },
    
    // Поля для формы создания/редактирования
    formFields: [
      {
        name: 'supplier',
        label: 'Кто привез',
        type: 'text',
        required: true,
        placeholder: 'Введите поставщика или водителя',
      },
      {
        name: 'comment',
        label: 'Комментарий',
        type: 'textarea',
        required: false,
        placeholder: 'Введите комментарий к задаче',
        rows: 4,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: true,
      },
    ],
    
    // Тип задачи для модального окна
    modalType: 'arrival',
    
    // Фильтр "Скрыть выполненные" (по умолчанию включен)
    hideCompletedByDefault: true,
    
    // Количество задач на странице
    perPage: 10,
  },

  // ============================================
  // Хаб: Регионы
  // ============================================
  [HUB_TYPES.REGIONS]: {
    id: 'regions',
    title: '🌍 Регионы',
    icon: '🌍',
    route: '/hub/regions',
    
    api: {
      list: '/api/tasks/regions',
      create: '/api/tasks/regions',
      update: (id) => `/api/tasks/${id}`,
      delete: (id) => `/api/tasks/${id}`,
      take: (id) => `/api/tasks/${id}/take`,
      complete: (id) => `/api/tasks/${id}/complete`,
      decline: (id) => `/api/tasks/${id}/decline`,
      reassign: (id) => `/api/tasks/${id}/reassign`,
      uploadPhotos: (id) => `/api/tasks/${id}/photos`,
    },
    
    formFields: [
      {
        name: 'region',
        label: 'Название региона',
        type: 'text',
        required: true,
        placeholder: 'Введите название региона',
      },
      {
        name: 'description',
        label: 'Описание',
        type: 'textarea',
        required: false,
        placeholder: 'Введите описание региона',
        rows: 4,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: false,
      },
    ],
    
    modalType: 'region',
    hideCompletedByDefault: true,
    perPage: 10,
  },

  // ============================================
  // Хаб: СПб
  // ============================================
  [HUB_TYPES.SPB]: {
    id: 'spb',
    title: '🏙️ СПб',
    icon: '🏙️',
    route: '/hub/spb',
    
    api: {
      list: '/api/tasks/spb',
      create: '/api/tasks/spb',
      update: (id) => `/api/tasks/${id}`,
      delete: (id) => `/api/tasks/${id}`,
      take: (id) => `/api/tasks/${id}/take`,
      complete: (id) => `/api/tasks/${id}/complete`,
      decline: (id) => `/api/tasks/${id}/decline`,
      reassign: (id) => `/api/tasks/${id}/reassign`,
      uploadPhotos: (id) => `/api/tasks/${id}/photos`,
    },
    
    formFields: [
      {
        name: 'terminal',
        label: 'Терминал',
        type: 'text',
        required: true,
        placeholder: 'Введите название терминала',
      },
      {
        name: 'address',
        label: 'Адрес',
        type: 'text',
        required: false,
        placeholder: 'Введите адрес',
      },
      {
        name: 'comment',
        label: 'Комментарий',
        type: 'textarea',
        required: false,
        placeholder: 'Введите комментарий',
        rows: 4,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: false,
      },
    ],
    
    modalType: 'spb',
    hideCompletedByDefault: true,
    perPage: 10,
  },

  // ============================================
  // Хаб: Счета
  // ============================================
  [HUB_TYPES.INVOICES]: {
    id: 'invoices',
    title: '📊 Счета',
    icon: '📊',
    route: '/hub/invoices',
    
    api: {
      list: '/api/tasks/invoices',
      create: '/api/tasks/invoices',
      update: (id) => `/api/tasks/${id}`,
      delete: (id) => `/api/tasks/${id}`,
      take: (id) => `/api/tasks/${id}/take`,
      complete: (id) => `/api/tasks/${id}/complete`,
      decline: (id) => `/api/tasks/${id}/decline`,
      reassign: (id) => `/api/tasks/${id}/reassign`,
      uploadPhotos: (id) => `/api/tasks/${id}/photos`,
    },
    
    formFields: [
      {
        name: 'invoiceNumber',
        label: 'Номер счета',
        type: 'text',
        required: true,
        placeholder: 'Введите номер счета',
      },
      {
        name: 'client',
        label: 'Клиент',
        type: 'text',
        required: true,
        placeholder: 'Введите название клиента',
      },
      {
        name: 'amount',
        label: 'Сумма',
        type: 'text',
        required: false,
        placeholder: 'Введите сумму',
      },
      {
        name: 'comment',
        label: 'Комментарий',
        type: 'textarea',
        required: false,
        placeholder: 'Введите комментарий',
        rows: 4,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: false,
      },
    ],
    
    modalType: 'invoice',
    hideCompletedByDefault: true,
    perPage: 10,
  },

  // ============================================
  // Хаб: ЭйрТрафик
  // ============================================
  [HUB_TYPES.AIR_TRAFFIC]: {
    id: 'airtraffic',
    title: '✈️ ЭйрТрафик',
    icon: '✈️',
    route: '/hub/airtraffic',
    
    api: {
      list: '/api/tasks/airtraffic',
      create: '/api/tasks/airtraffic',
      update: (id) => `/api/tasks/${id}`,
      delete: (id) => `/api/tasks/${id}`,
      take: (id) => `/api/tasks/${id}/take`,
      complete: (id) => `/api/tasks/${id}/complete`,
      decline: (id) => `/api/tasks/${id}/decline`,
      reassign: (id) => `/api/tasks/${id}/reassign`,
      uploadPhotos: (id) => `/api/tasks/${id}/photos`,
    },
    
    formFields: [
      {
        name: 'flightNumber',
        label: 'Номер рейса',
        type: 'text',
        required: true,
        placeholder: 'Введите номер рейса',
      },
      {
        name: 'airline',
        label: 'Авиакомпания',
        type: 'text',
        required: false,
        placeholder: 'Введите авиакомпанию',
      },
      {
        name: 'terminal',
        label: 'Терминал',
        type: 'text',
        required: false,
        placeholder: 'Введите терминал',
      },
      {
        name: 'comment',
        label: 'Комментарий',
        type: 'textarea',
        required: false,
        placeholder: 'Введите комментарий',
        rows: 4,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: false,
      },
    ],
    
    modalType: 'airtraffic',
    hideCompletedByDefault: true,
    perPage: 10,
  },

  // ============================================
  // Хаб: Задачи
  // ============================================
  [HUB_TYPES.TASKS]: {
    id: 'tasks',
    title: '📋 Задачи',
    icon: '📋',
    route: '/hub/tasks',
    
    api: {
      list: '/api/tasks/all',
      create: '/api/tasks/all',
      update: (id) => `/api/tasks/${id}`,
      delete: (id) => `/api/tasks/${id}`,
      take: (id) => `/api/tasks/${id}/take`,
      complete: (id) => `/api/tasks/${id}/complete`,
      decline: (id) => `/api/tasks/${id}/decline`,
      reassign: (id) => `/api/tasks/${id}/reassign`,
      uploadPhotos: (id) => `/api/tasks/${id}/photos`,
    },
    
    formFields: [
      {
        name: 'title',
        label: 'Название задачи',
        type: 'text',
        required: true,
        placeholder: 'Введите название задачи',
      },
      {
        name: 'description',
        label: 'Описание',
        type: 'textarea',
        required: false,
        placeholder: 'Введите описание задачи',
        rows: 4,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: false,
      },
    ],
    
    modalType: 'task',
    hideCompletedByDefault: true,
    perPage: 10,
  },
};

/**
 * Получить конфигурацию хаба по типу
 */
export const getHubConfig = (hubType) => {
  return hubConfigs[hubType] || null;
};

/**
 * Получить список всех типов хабов
 */
export const getHubTypes = () => {
  return Object.keys(HUB_TYPES).map(key => ({
    key: key,
    type: HUB_TYPES[key],
    config: hubConfigs[HUB_TYPES[key]],
  }));
};

export default hubConfigs;