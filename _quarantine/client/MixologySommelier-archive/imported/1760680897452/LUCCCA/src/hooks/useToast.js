import { useState } from 'react';

export function useToast() {
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message) => {
    setToastMessage(message);
  };

  const clearToast = () => {
    setToastMessage('');
  };

  return {
    toastMessage,
    showToast,
    clearToast,
  };
}
