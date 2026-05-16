// usePOSData.js
import { useEffect, useState } from 'react';
import POSIntegration from './POSIntegration';

/**
 * Hook for retrieving POS data.
 */
export default function usePOSData(apiEndpoint) {
  const [salesData, setSalesData] = useState([]);
  useEffect(() => {
    const pos = new POSIntegration(apiEndpoint);
    pos.fetchSalesData().then(setSalesData);
  }, [apiEndpoint]);
  return salesData;
}
