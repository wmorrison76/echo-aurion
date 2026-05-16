import { useCallback, useEffect, useState } from "react";
import * as FF from "../feature-flags/FeatureFlags.js";

export function useFeature(flag){
  const [on, setOn] = useState(FF.isOn(flag));
  useEffect(()=>{ setOn(FF.isOn(flag)); }, [flag]);
  const toggle = useCallback((val)=>{
    const v = typeof val === "boolean" ? val : !FF.isOn(flag);
    FF.set(flag, v);
    setOn(v);
  }, [flag]);
  return { on, toggle };
}

export function useAllFeatures(){
  const [flags, setFlags] = useState(FF.all());
  useEffect(()=>{ setFlags(FF.all()); }, []);
  const set = useCallback((k,v)=>{ setFlags(FF.set(k, v)); }, []);
  const reset = useCallback(()=>{ FF.reset(); setFlags(FF.all()); }, []);
  return { flags, set, reset };
}
