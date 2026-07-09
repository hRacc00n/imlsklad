import { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState(null);
  const [taskType, setTaskType] = useState(null);
  const [actions, setActions] = useState({});

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

  return (
    <ModalContext.Provider value={{ 
      isOpen, 
      task, 
      taskType, 
      actions, 
      openModal, 
      closeModal,
      updateTask,
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