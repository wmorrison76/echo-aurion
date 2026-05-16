import React, { useState } from 'react';
import { ButtonPrimary } from '../components/ButtonPrimary';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    alert(`Logging in as: ${username}`); // Placeholder logic
  };

  return (
    <div className="login-page flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">LUCCCA System Login</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm">
        <input
          className="mb-2 w-full p-2 border rounded"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="mb-2 w-full p-2 border rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ButtonPrimary label="Login" onClick={handleLogin} />
      </form>
    </div>
  );
}
