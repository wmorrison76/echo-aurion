import React, { useState } from 'react';

export function EchoResponsePanel() {
  const [response, setResponse] = useState("System Standing By...");

  const handleEchoCall = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/echo');
      const data = await res.json();
      setResponse(data.message);
    } catch (err) {
      setResponse("Error connecting to Echo.");
    }
  };

  return (
    <div className="echo-panel">
      <h2>Echo Core Communication</h2>
      <p>{response}</p>
      <button onClick={handleEchoCall}>Ping Echo</button>
    </div>
  );
}
