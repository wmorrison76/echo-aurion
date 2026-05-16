// File: src/components/EchoCore/components/interaction/useKeyPress.js
import { useEffect } from 'react';

const useKeyPress = (targetKey, callback) => {
  useEffect(() => {
    const keyHandler = ({ key }) => {
      if (key === targetKey) callback();
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [targetKey, callback]);
};

export default useKeyPress;
