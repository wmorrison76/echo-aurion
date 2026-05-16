// usePMSData.js
import { useEffect, useState } from 'react';
import PMSIntegration from './PMSIntegration';

/**
 * Hook for retrieving PMS data.
 */
export default function usePMSData(apiEndpoint) {
  const [guestData, setGuestData] = useState([]);
  useEffect(() => {
    const pms = new PMSIntegration(apiEndpoint);
    pms.fetchGuestData().then(setGuestData);
  }, [apiEndpoint]);
  return guestData;
}
