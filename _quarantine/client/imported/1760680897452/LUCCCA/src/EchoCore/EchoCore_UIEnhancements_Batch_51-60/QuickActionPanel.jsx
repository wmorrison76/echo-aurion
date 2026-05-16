// QuickActionPanel.jsx
import React from 'react';
import { FaCog, FaArrowRight, FaHome } from 'react-icons/fa';
import './QuickActionPanel.css';

/** Quick action shortcuts with hover effects */
const QuickActionPanel = ({ onHome, onSettings, onNext }) => (
  <div className="quick-action-panel">
    <button onClick={onHome}>
      <FaHome /> Home
    </button>
    <button onClick={onSettings}>
      <FaCog /> Settings
    </button>
    <button onClick={onNext}>
      <FaArrowRight /> Next
    </button>
  </div>
);

export default QuickActionPanel;
