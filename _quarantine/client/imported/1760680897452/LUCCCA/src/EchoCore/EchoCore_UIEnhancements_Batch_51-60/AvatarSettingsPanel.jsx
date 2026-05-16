// AvatarSettingsPanel.jsx
import React from 'react';
import EchoAvatar from './EchoAvatar';

/** Panel to adjust avatar settings such as mood */
const AvatarSettingsPanel = ({ mood, onChangeMood }) => (
  <div className="avatar-settings">
    <h3>Avatar Settings</h3>
    <select value={mood} onChange={e => onChangeMood(e.target.value)}>
      <option value="happy">Happy</option>
      <option value="thinking">Thinking</option>
      <option value="neutral">Neutral</option>
    </select>
    <EchoAvatar mood={mood} />
  </div>
);

export default AvatarSettingsPanel;
