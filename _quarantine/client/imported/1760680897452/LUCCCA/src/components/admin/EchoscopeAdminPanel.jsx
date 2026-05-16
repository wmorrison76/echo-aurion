import React, { useState } from 'react';

const initialItems = [
  { name: 'Champagne Cart', icon: '🍾', active: true },
  { name: 'Live Violinist', icon: '🎻', active: true },
  { name: 'Ice Sculpture', icon: '❄️', active: true },
  { name: 'Photo Booth', icon: '📸', active: true },
  { name: 'Signature Cocktail', icon: '🍸', active: true },
  { name: 'Cigar Lounge', icon: '🚬', active: false },
  { name: 'Dessert Table', icon: '🍰', active: false },
  { name: 'Fire Dancers', icon: '🔥', active: false },
];

const credentials = {
  username: 'admin',
  password: 'luccca123'
};

export default function EchoscopeAdminPanel() {
  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState({ name: '', icon: '', active: true });
  const [auth, setAuth] = useState(false);
  const [login, setLogin] = useState({ username: '', password: '' });

  const toggleActive = (index) => {
    const updated = [...items];
    updated[index].active = !updated[index].active;
    setItems(updated);
  };
const downloadJSON = (data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'echoscope_modifiers.json';
  link.click();
};

const handleFileUpload = (event) => {
  const fileReader = new FileReader();
  fileReader.onload = (e) => {
    const importedData = JSON.parse(e.target.result);
    setItems(importedData);
  };
  fileReader.readAsText(event.target.files[0]);
};

  const addItem = () => {
    if (!newItem.name || !newItem.icon) return;
    setItems([...items, newItem]);
    setNewItem({ name: '', icon: '', active: true });
  };

  const handleLogin = () => {
    if (login.username === credentials.username && login.password === credentials.password) {
      setAuth(true);
    } else {
      alert('Invalid credentials');
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-semibold mb-4">Admin Login</h2>
          <input
            type="text"
            placeholder="Username"
            className="w-full p-2 mb-3 border rounded"
            value={login.username}
            onChange={(e) => setLogin({ ...login, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 mb-4 border rounded"
            value={login.password}
            onChange={(e) => setLogin({ ...login, password: e.target.value })}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6">Echoscope Admin Panel</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Modifier Items</h2>
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2 border rounded bg-white"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                <button
                  onClick={() => toggleActive(idx)}
                  className={`px-2 py-1 rounded text-sm ${
                    item.active ? 'bg-green-500 text-white' : 'bg-gray-300 text-black'
                  }`}
                >
                  {item.active ? 'Active' : 'Hidden'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Add New Modifier</h2>
          <input
            type="text"
            placeholder="Name"
            className="w-full p-2 mb-2 border rounded"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Icon (Emoji)"
            className="w-full p-2 mb-2 border rounded"
            value={newItem.icon}
            onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })}
          />
          <button
            onClick={addItem}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Add Modifier
          </button>
            <button
  onClick={() => downloadJSON(items)}
  className="mt-4 bg-green-600 text-white p-2 rounded hover:bg-green-700"
>
  Download Modifiers JSON
</button>

<input
  type="file"
  accept=".json"
  onChange={handleFileUpload}
  className="mt-4"
/>

        </div>
      </div>
    </div>
  );
}
