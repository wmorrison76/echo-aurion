// EchoThemeSwitch.jsx
import React from 'react';

/** Theme switcher for light and dark modes */
const EchoThemeSwitch = ({ theme, onToggle }) => (
  <button onClick={onToggle} className="theme-switcher">
    Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
  </button>
);

export default EchoThemeSwitch;
