import { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState(null);
  const [taskType, setTaskType] = useState(null); // 'arrival', 'region', 'spb', etc.

  const openModal = (taskData, type) => {
    setTask(taskData);
    setTaskType(type);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTask(null);
    setTaskType(null);
  };

  return (
    <ModalContext.Provider value={{ isOpen, task, taskType, openModal, closeModal }}>
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