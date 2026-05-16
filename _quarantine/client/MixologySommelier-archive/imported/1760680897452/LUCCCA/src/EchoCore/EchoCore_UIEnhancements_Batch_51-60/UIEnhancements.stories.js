// UIEnhancements.stories.js
import React, { useState } from 'react';
import EchoAvatar from './EchoAvatar';
import EchoThemeSwitch from './EchoThemeSwitch';

export default {
  title: 'UIEnhancements',
};

export const AvatarMood = () => {
  const [mood, setMood] = useState('happy');
  return (
    <div>
      <select value={mood} onChange={e => setMood(e.target.value)}>
        <option value="happy">Happy</option>
        <option value="thinking">Thinking</option>
        <option value="neutral">Neutral</option>
      </select>
      <EchoAvatar mood={mood} />
    </div>
  );
};

export const ThemeSwitch = () => {
  const [theme, setTheme] = useState('light');
  return (
    <EchoThemeSwitch theme={theme} onToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
  );
};
