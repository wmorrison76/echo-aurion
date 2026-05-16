// LoadingScreen.jsx
import React from 'react';

/** Shown while the application is loading */
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner" />
    <p>Loading… please wait</p>
  </div>
);

export default LoadingScreen;
