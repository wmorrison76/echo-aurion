/**
 * useScheduleStore — minimal context-based store for shifts/events.
 * Avoids external deps (Zustand/Redux) to keep mobile shell lean.
 */
import React, { createContext, useContext, useMemo, useReducer } from "react";

const Ctx = createContext(null);

const initial = {
  employees: /** @type {Array<{id:string,name:string,role?:string}>} */ ([]),
  shifts:    /** @type {Array<{id:string,empId:string,start:number,end:number,location?:string}>} */ ([]),
};

function reducer(state, action){
  switch(action.type){
    case "seed":
      return { ...state, ...action.payload };
    case "addEmployee":
      return { ...state, employees: [...state.employees, action.employee] };
    case "addShift":
      return { ...state, shifts: [...state.shifts, action.shift] };
    case "updateShift":
      return { ...state, shifts: state.shifts.map(s=> s.id===action.shift.id ? {...s, ...action.shift} : s) };
    case "removeShift":
      return { ...state, shifts: state.shifts.filter(s=> s.id!==action.id) };
    default:
      return state;
  }
}

export function ScheduleProvider({ children, seed }){
  const [state, dispatch] = useReducer(reducer, { ...initial, ...(seed||{}) });
  const api = useMemo(()=> ({
    state,
    addEmployee: (employee) => dispatch({ type:"addEmployee", employee }),
    addShift:    (shift)    => dispatch({ type:"addShift", shift }),
    updateShift: (shift)    => dispatch({ type:"updateShift", shift }),
    removeShift: (id)       => dispatch({ type:"removeShift", id }),
    seed:        (data)     => dispatch({ type:"seed", payload:data }),
  }), [state]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useScheduleStore(){
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useScheduleStore must be used within <ScheduleProvider>");
  return ctx;
}
