import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { EchoStatusMonitor } from '../components/EchoStatusMonitor';
import { NotificationBanner } from '../components/NotificationBanner';
import { SystemStatusDisplay } from '../components/SystemStatusDisplay';
import { UserWelcomeBanner } from '../components/UserWelcomeBanner';
import { SystemControlPanel } from '../components/SystemControlPanel';
import { AlertMessage } from '../components/AlertMessage';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ToastNotification } from '../components/ToastNotification';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useSystemNotifications } from '../hooks/useSystemNotifications';
import { useSystemLogger } from '../hooks/useSystemLogger';
import { useAlert } from '../hooks/useAlert';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useToast } from '../hooks/useToast';
import { useConfirmationDialog } from '../hooks/useConfirmationDialog';

export function MainLayout({ children }) {
  const message = useSystemNotifications();
  const { alert, showAlert } = useAlert();
  const { paths } = useBreadcrumbs(['Home']);
  const { toastMessage, showToast, clearToast } = useToast();
  const { isOpen, dialogConfig, openDialog, closeDialog } = useConfirmationDialog();

  useSystemLogger(message);

  return (
    <div className="main-layout">
      <Navbar />
      <NotificationBanner message={message} />
      <UserWelcomeBanner user="Chef" />
      <Breadcrumbs paths={paths} />
      <EchoStatusMonitor />
      <SystemStatusDisplay />
      <SystemControlPanel />
      <AlertMessage type={alert.type} message={alert.message} />
      <main>{children}</main>
      <Footer />
      <ToastNotification message={toastMessage} onClose={clearToast} />
      <ConfirmationDialog
        isOpen={isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={() => {
          dialogConfig.onConfirm();
          closeDialog();
        }}
        onCancel={closeDialog}
      />
    </div>
  );
}
