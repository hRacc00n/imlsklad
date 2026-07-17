/**
 * Типы хабов
 */
export const HUB_TYPES = {
  ARRIVALS: 'arrivals',
  REGIONS: 'regions',
  SPB: 'spb',
  INVOICES: 'invoices',
  AIR_TRAFFIC: 'air_traffic',
  TASKS: 'tasks',
  GALLERY: 'gallery',
};

/**
 * Конфигурация для каждого хаба
 */
export const HUB_CONFIGS = {
  [HUB_TYPES.ARRIVALS]: {
    id: HUB_TYPES.ARRIVALS,
    title: 'Поступление',
    icon: '📦',
    apiUrl: '/api/tasks/arrivals', // ← УНИКАЛЬНЫЙ URL
    modalType: 'arrival',
    perPage: 10,
    hideCompletedByDefault: true,
    formFields: [
      {
        name: 'supplier',
        label: 'Кто привез',
        type: 'text',
        placeholder: 'Введите поставщика или водителя',
        required: true,
      },
      {
        name: 'comment',
        label: 'Комментарий',
        type: 'textarea',
        placeholder: 'Введите комментарий к задаче',
        required: false,
        rows: 4,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: false,
      },
    ],
  },

  [HUB_TYPES.REGIONS]: {
    id: HUB_TYPES.REGIONS,
    title: 'Регионы',
    icon: '🌍',
    apiUrl: '/api/tasks/regions',
    modalType: 'region',
    perPage: 10,
    hideCompletedByDefault: true,
    showCreateButton: false,  
    formFields: [],           
  },

  [HUB_TYPES.SPB]: {
    id: HUB_TYPES.SPB,
    title: 'СПб',
    icon: '🏙️',
    apiUrl: '/api/tasks/spb',
    modalType: 'spb',
    perPage: 10,
    hideCompletedByDefault: true,
    showCreateButton: false,  
    formFields: [],           
  },

  [HUB_TYPES.INVOICES]: {
    id: HUB_TYPES.INVOICES,
    title: 'Счета',
    icon: '📊',
    apiUrl: '/api/tasks/invoices',
    modalType: 'invoice',
    perPage: 10,
    hideCompletedByDefault: true,
    showCreateButton: false,
    formFields: [],
  },

  [HUB_TYPES.AIR_TRAFFIC]: {
    id: HUB_TYPES.AIR_TRAFFIC,
    title: 'ЭйрТрафик',
    icon: '✈️',
    apiUrl: '/api/tasks/air_traffic',
    modalType: 'air_traffic',
    perPage: 10,
    hideCompletedByDefault: true,
    showCreateButton: false, 
    formFields: [],          
},

  [HUB_TYPES.TASKS]: {
    id: HUB_TYPES.TASKS,
    title: 'Задачи',
    icon: '📋',
    apiUrl: '/api/personal-tasks',
    modalType: 'personal_task',
    perPage: 10,
    hideCompletedByDefault: true,
    showCreateButton: true,
    formFields: [
      {
        name: 'title',
        label: 'Название задачи',
        type: 'text',
        placeholder: 'Введите название',
        required: true,
      },
      {
        name: 'description',
        label: 'Описание',
        type: 'textarea',
        placeholder: 'Введите описание (необязательно)',
        required: false,
        rows: 4,
      },
      {
        name: 'assigned_to',
        label: 'Исполнители',
        type: 'users',
        placeholder: 'Выберите исполнителей',
        required: false,
        multiple: true,
      },
      {
        name: 'items',
        label: 'Подпункты (чекбоксы)',
        type: 'items',
        placeholder: 'Добавьте подпункт',
        required: false,
      },
      {
        name: 'files',
        label: 'Файлы',
        type: 'files',
        required: false,
      },
    ],
  },

  [HUB_TYPES.GALLERY]: {
    id: HUB_TYPES.GALLERY,
    title: 'Галерея отгрузок',
    icon: '🖼️',
    apiUrl: '/api/gallery',
    modalType: 'gallery',
    perPage: 10,
    hideCompletedByDefault: false,
    showCreateButton: true,
    formFields: [
      {
        name: 'city',
        label: 'Город',
        type: 'text',
        placeholder: 'Введите город',
        required: true,
      },
      {
        name: 'description',
        label: 'Описание',
        type: 'textarea',
        placeholder: 'Введите описание (необязательно)',
        required: false,
        rows: 3,
      },
      {
        name: 'photos',
        label: 'Фотографии',
        type: 'photos',
        required: false,
      },
    ],
  },
};

/**
 * Получить конфигурацию хаба по типу
 * @param {string} type - тип хаба из HUB_TYPES
 * @returns {Object} конфигурация хаба
 */
export const getHubConfig = (type) => {
  const config = HUB_CONFIGS[type];
  if (!config) {
    console.warn(`Конфигурация для типа "${type}" не найдена`);
    return null;
  }
  return config;
};

/**
 * Получить список всех хабов для отображения на главной
 * @returns {Array} массив конфигураций хабов
 */
export const getAllHubs = () => {
  return Object.values(HUB_CONFIGS).map((config) => ({
    id: config.id,
    name: config.title,
    icon: config.icon,
    apiUrl: config.apiUrl,
    path: `/hub/${config.id}`,
  }));
};

export default HUB_CONFIGS;