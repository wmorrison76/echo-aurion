import { LUCCCA_VERSION } from '../utils/systemConstants';
import { useState, useEffect } from 'react';

export function useSystemVersion() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    setVersion(LUCCCA_VERSION);
  }, []);

  return version;
}
