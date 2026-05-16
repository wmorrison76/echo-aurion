import { useState } from 'react';

export function useAlert() {
  const [alert, setAlert] = useState({ type: '', message: '' });

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert({ type: '', message: '' });
    }, 3000);
  };

  return { alert, showAlert };
}
