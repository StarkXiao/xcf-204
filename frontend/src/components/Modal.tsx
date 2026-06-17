import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'default' | 'large';
}

const Modal = ({ isOpen, onClose, title, children, size = 'default' }: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses = {
    default: 'max-w-lg',
    large: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
