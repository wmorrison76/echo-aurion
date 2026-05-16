import React from 'react';
import { Tabs } from '../components/Tabs';

export default function Settings() {
  const tabs = [
    {
      label: 'General',
      content: <p>General system settings will go here.</p>,
    },
    {
      label: 'Echo AI',
      content: <p>Echo AI configuration options will appear here.</p>,
    },
    {
      label: 'Security',
      content: <p>Security settings and user permissions will go here.</p>,
    },
  ];

  return (
    <div className="settings-page">
      <h1 className="text-2xl font-bold mb-4">System Settings</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}
