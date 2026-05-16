// useFeedbackEngine.js
// Hook to access UserFeedbackEngine.

import { useContext } from 'react';
import { UserFeedbackContext } from './UserFeedbackContext';
export default function useFeedbackEngine() {
  return useContext(UserFeedbackContext);
}
