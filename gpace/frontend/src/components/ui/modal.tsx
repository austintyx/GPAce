import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className="mb-4">{children}</div>
        <div className="flex justify-end">
          {actions}
          <button onClick={onClose} className="ml-2 px-4 py-2 bg-gray-300 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;