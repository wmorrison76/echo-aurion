import React from "react";
import EchoAnimator from "./EchoAnimator";

const DashboardTransitionWrapper = ({ children }) => {
  return (
    <EchoAnimator type="slideUp" duration={0.4}>
      <div className="transition-all duration-500 ease-in-out">{children}</div>
    </EchoAnimator>
  );
};

export default DashboardTransitionWrapper;