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
import { useSystemNotifications } from '../hooks/useSystemNotifications';
import { useSystemLogger } from '../hooks/useSystemLogger';
import { useAlert } from '../hooks/useAlert';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';

function MainLayout({ children }) {
  const message = useSystemNotifications();
  const { alert, showAlert } = useAlert();
  const { paths, updateBreadcrumbs } = useBreadcrumbs(['Home']);

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
    </div>
  );
}

export default MainLayout;
