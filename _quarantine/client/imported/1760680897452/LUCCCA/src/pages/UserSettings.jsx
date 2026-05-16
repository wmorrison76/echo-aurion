import React, { useState } from 'react';
import { FormFieldGroup } from '../components/FormFieldGroup';
import { FormButton } from '../components/FormButton';

export default function UserSettings() {
  const [username, setUsername] = useState('Chef');
  const [email, setEmail] = useState('chef@example.com');

  const handleSave = () => {
    alert('Settings saved!'); // Placeholder action
  };

  return (
    <div className="user-settings-page">
      <h1 className="text-2xl font-bold mb-4">User Settings</h1>
      <FormFieldGroup label="Username">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </FormFieldGroup>

      <FormFieldGroup label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </FormFieldGroup>

      <FormButton label="Save Changes" onClick={handleSave} />
    </div>
  );
}
