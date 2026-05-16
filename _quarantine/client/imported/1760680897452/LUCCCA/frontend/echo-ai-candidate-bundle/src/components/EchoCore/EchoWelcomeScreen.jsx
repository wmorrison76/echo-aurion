// EchoWelcomeScreen.jsx
import React from 'react';

/** Welcome screen shown on startup */
const EchoWelcomeScreen = ({ onContinue }) => (
  <div className="welcome-screen">
    <h1>Welcome to EchoCore</h1>
    <p>Your smart assistant is ready to help.</p>
    <button onClick={onContinue}>Get Started</button>
  </div>
);

export default EchoWelcomeScreen;
