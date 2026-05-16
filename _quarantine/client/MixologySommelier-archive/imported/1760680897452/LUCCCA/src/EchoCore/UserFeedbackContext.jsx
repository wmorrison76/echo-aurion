// UserFeedbackContext.jsx
// Context for providing user feedback across the app.

import React, { createContext, useContext } from 'react';
export const UserFeedbackContext = createContext(null);
export const useUserFeedback = () => useContext(UserFeedbackContext);
