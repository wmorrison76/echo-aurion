// Toolbar.jsx
import React from 'react';
import { FaUserCog } from 'react-icons/fa';
import EchoThemeSwitch from './EchoThemeSwitch';

/** Toolbar extended with theme toggle and shortcut icons */
const Toolbar = ({ theme, onToggleTheme, onOpenSettings }) => (
  <div className="toolbar">
    <EchoThemeSwitch theme={theme} onToggle={onToggleTheme} />
    <button onClick={onOpenSettings} className="settings-button">
      <FaUserCog />
    </button>
  </div>
);

export default Toolbar;
