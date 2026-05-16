import React from 'react';
import { ButtonPrimary } from './ButtonPrimary';
import { useModal } from '../hooks/useModal';
import { ModalBasic } from './ModalBasic';

export function SystemControlPanel() {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div className="system-control-panel">
      <ButtonPrimary label="Open System Controls" onClick={openModal} />
      <ModalBasic isOpen={isOpen} onClose={closeModal} title="System Control Panel">
        <p>System controls and administrative functions will appear here.</p>
      </ModalBasic>
    </div>
  );
}
