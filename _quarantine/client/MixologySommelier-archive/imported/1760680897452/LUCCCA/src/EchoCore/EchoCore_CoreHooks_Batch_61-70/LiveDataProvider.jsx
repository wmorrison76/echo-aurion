// LiveDataProvider.jsx
import React, { createContext, useContext } from 'react';
import useLiveDataHook from './useLiveDataHook';

/**
 * Provides live data to children via React Context.
 */
const LiveDataContext = createContext(null);

export const useLiveData = () => useContext(LiveDataContext);

const LiveDataProvider = ({ url, children }) => {
  const data = useLiveDataHook(url);
  return (
    <LiveDataContext.Provider value={data}>
      {children}
    </LiveDataContext.Provider>
  );
};

export default LiveDataProvider;
