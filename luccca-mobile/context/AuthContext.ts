import React from 'react';

export interface AuthContextType {
  state: {
    isLoading: boolean;
    isSignout: boolean;
    userToken: string | null;
  };
  dispatch: React.Dispatch<any>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType>({
  state: {
    isLoading: true,
    isSignout: false,
    userToken: null,
  },
  dispatch: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});
