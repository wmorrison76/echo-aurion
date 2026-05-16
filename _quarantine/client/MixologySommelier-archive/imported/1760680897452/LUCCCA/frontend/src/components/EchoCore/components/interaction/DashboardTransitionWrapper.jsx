// File: src/components/EchoCore/components/interaction/DashboardTransitionWrapper.jsx
import React from 'react';
import EchoAnimator from './EchoAnimator';

const DashboardTransitionWrapper = ({ children }) => {
  return (
    <div className="grid gap-4">
      {React.Children.map(children, (child, i) => (
        <EchoAnimator delay={i * 0.1}>{child}</EchoAnimator>
      ))}
    </div>
  );
};export default DashboardTransitionWrapper;