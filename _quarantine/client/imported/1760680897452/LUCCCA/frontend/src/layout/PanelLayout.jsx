import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import EchoCommandDock from '../components/EchoCore/EchoCommandDock';

export function PanelLayout({ children }) {
  return (
    <div className="panel-layout flex flex-col min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Navbar />
      <EchoCommandDock />
      <main className="flex-1 overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
