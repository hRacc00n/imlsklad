import { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState(null);
  const [taskType, setTaskType] = useState(null);
  const [actions, setActions] = useState({});

  // Состояние для формы создания личной задачи
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFormCallback, setTaskFormCallback] = useState(null);

  // Состояние для формы создания новости
  const [isNewsFormOpen, setIsNewsFormOpen] = useState(false);
  const [newsFormCallback, setNewsFormCallback] = useState(null);

  const openModal = (taskData, type, modalActions = {}) => {
    setTask(taskData);
    setTaskType(type);
    setActions(modalActions);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTask(null);
    setTaskType(null);
    setActions({});
  };

  const updateTask = (updatedTask) => {
    setTask(updatedTask);
  };

  // Методы для формы создания личной задачи
  const openTaskForm = (callback = null) => {
    setTaskFormCallback(() => callback);
    setIsTaskFormOpen(true);
  };

  const closeTaskForm = () => {
    setIsTaskFormOpen(false);
    setTaskFormCallback(null);
  };

  const openNewsForm = (callback = null) => {
    setNewsFormCallback(() => callback);
    setIsNewsFormOpen(true);
  };

  const closeNewsForm = () => {
    setIsNewsFormOpen(false);
    setNewsFormCallback(null);
  };

  return (
    <ModalContext.Provider value={{ 
      isOpen, 
      task, 
      taskType, 
      actions, 
      openModal, 
      closeModal,
      updateTask,
      // Форма создания личной задачи
      isTaskFormOpen,
      openTaskForm,
      closeTaskForm,
      isNewsFormOpen,
      openNewsForm,
      closeNewsForm,
      newsFormCallback,
      taskFormCallback,
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}