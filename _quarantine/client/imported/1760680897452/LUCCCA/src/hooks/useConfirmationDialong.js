
import { useState } from 'react';

export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openDialog = (title, message, onConfirm) => {
    setDialogConfig({ title, message, onConfirm });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    dialogConfig,
    openDialog,
    closeDialog,
  };
}
