// File: src/components/EchoCore/components/interaction/QuickActionPanel.jsx
import React from 'react';
import UIActionButton from './UIActionButton';

const QuickActionPanel = ({ actions }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action, i) => (
        <UIActionButton key={i} label={action.label} onClick={action.onClick} />
      ))}
    </div>
  );
};

export default QuickActionPanel;
