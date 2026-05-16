// useLiveDataHook.js
import { useEffect, useState } from 'react';

/**
 * Custom hook for real-time data updates via WebSocket.
 */
export default function useLiveDataHook(url) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socket.onmessage = (event) => setData(JSON.parse(event.data));
    return () => socket.close();
  }, [url]);

  return data;
}
