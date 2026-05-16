// useUserPresenceHook.js
import { useEffect, useState } from 'react';

/**
 * Hook to track active/online users.
 */
export default function useUserPresenceHook(url) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const socket = new WebSocket(url);
    socket.onmessage = (event) => setUsers(JSON.parse(event.data));
    return () => socket.close();
  }, [url]);

  return users;
}
