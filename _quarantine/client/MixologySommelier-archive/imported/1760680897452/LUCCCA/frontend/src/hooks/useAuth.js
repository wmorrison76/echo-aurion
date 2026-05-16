import { useState, useEffect } from 'react';
import { getDefaultUser } from '../utils/auth';

export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const defaultUser = getDefaultUser();
    setUser(defaultUser);
  }, []);

  return { user, setUser };
}
