import React, { createContext, useContext, useReducer } from "react";

const ChefNetStateContext = createContext(null);
const ChefNetDispatchContext = createContext(null);

/**
 * Basic reducer powering the ChefNet UI.
 * This is intentionally lightweight; persistence is delegated to apiClient.
 */
const initialState = {
  currentTab: "feed",
  posts: [],
  ventingMessages: [],
  recognitions: [],
  jobs: [],
  wellbeingSignals: [],
  mentors: [],
  resources: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, currentTab: action.tab };
    case "LOADING":
      return { ...state, loading: true, error: null };
    case "ERROR":
      return { ...state, loading: false, error: action.error || "Something went wrong." };
    case "LOAD_SNAPSHOT":
      return { ...state, ...action.payload, loading: false, error: null };
    case "ADD_POST":
      return { ...state, posts: [action.post, ...state.posts] };
    case "ADD_VENT":
      return { ...state, ventingMessages: [action.message, ...state.ventingMessages] };
    case "ADD_RECOGNITION":
      return { ...state, recognitions: [action.recognition, ...state.recognitions] };
    case "ADD_JOB":
      return { ...state, jobs: [action.job, ...state.jobs] };
    case "ADD_WELLBEING_SIGNAL":
      return { ...state, wellbeingSignals: [action.signal, ...state.wellbeingSignals] };
    case "SET_MENTORS":
      return { ...state, mentors: action.mentors };
    case "SET_RESOURCES":
      return { ...state, resources: action.resources };
    default:
      return state;
  }
}

export function ChefNetProvider({ children, initialSnapshot }) {
  const [state, dispatch] = useReducer(reducer, initialSnapshot || initialState);
  return (
    <ChefNetStateContext.Provider value={state}>
      <ChefNetDispatchContext.Provider value={dispatch}>
        {children}
      </ChefNetDispatchContext.Provider>
    </ChefNetStateContext.Provider>
  );
}

export function useChefNetState() {
  const ctx = useContext(ChefNetStateContext);
  if (!ctx) throw new Error("useChefNetState must be used within ChefNetProvider");
  return ctx;
}

export function useChefNetDispatch() {
  const ctx = useContext(ChefNetDispatchContext);
  if (!ctx) throw new Error("useChefNetDispatch must be used within ChefNetProvider");
  return ctx;
}

export function useChefNet() {
  return [useChefNetState(), useChefNetDispatch()];
}
