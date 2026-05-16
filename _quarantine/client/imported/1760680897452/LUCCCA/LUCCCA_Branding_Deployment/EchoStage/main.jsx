import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div>
      <h1>EchoSocial is running</h1>
      <button>Post Dish</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
