// File: src/components/EchoCore/components/interaction/useKeyPress.js

import { useEffect } from "react";

const useKeyPress = (targetKey, handler) => {
  useEffect(() => {
    const keyHandler = ({ key }) => {
      if (key === targetKey) handler();
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [targetKey, handler]);
};

export default useKeyPress;
