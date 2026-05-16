import React from 'react';
import { AdminModuleToggle } from '../components/AdminModuleToggle';

export default function AdminModuleSettings() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Module Access Control</h1>
      <AdminModuleToggle moduleName="Pastry & Baking Module" defaultEnabled={true} />
      <AdminModuleToggle moduleName="Cake Designer" defaultEnabled={true} />
      <AdminModuleToggle moduleName="Photo Gallery" defaultEnabled={true} />
    </div>
  );
}
