import React from 'react';
import { AuthScreen } from './AuthScreen';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <AuthScreen
        isModal={true}
        onCancel={onClose}
        onSuccess={(role) => {
          if (onSuccess) onSuccess(role);
          onClose();
        }}
      />
    </div>
  );
};

