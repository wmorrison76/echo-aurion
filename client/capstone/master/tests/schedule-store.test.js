import { renderHook, act } from "@testing-library/react";
import { ScheduleProvider, useScheduleStore } from "../src/mobile/scheduler/hooks/useScheduleStore.js";

function setup(){
  return renderHook(()=>useScheduleStore(), {
    wrapper: ({children})=> <ScheduleProvider>{children}</ScheduleProvider>
  });
}

test("Add employee and shift", ()=>{
  const { result } = setup();
  act(()=>{ result.current.addEmployee({id:"e1", name:"Alex"}); });
  expect(result.current.state.employees).toHaveLength(1);
});
