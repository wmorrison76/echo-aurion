// PMSDashboard.jsx
import React from 'react';
import usePMSData from './usePMSData';

/**
 * Displays PMS guest data.
 */
const PMSDashboard = ({ apiEndpoint }) => {
  const guestData = usePMSData(apiEndpoint);
  return (
    <div className="pms-dashboard">
      <h3>PMS Guest Data</h3>
      <ul>
        {guestData.map((guest, i) => <li key={i}>{guest.name} - {guest.room}</li>)}
      </ul>
    </div>
  );
};

export default PMSDashboard;
