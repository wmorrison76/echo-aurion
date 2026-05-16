// useWhiteboardState.js
import { useReducer } from 'react';

/**
 * Hook for managing whiteboard state (v2).
 */
const initialState = { elements: [], history: [] };

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ELEMENT':
      return { ...state, elements: [...state.elements, action.payload] };
    case 'UNDO':
      return { ...state, elements: state.history.pop() || state.elements };
    default:
      return state;
  }
}

export default function useWhiteboardState() {
  return useReducer(reducer, initialState);
}
