import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "shiftflow:theme";

export default function ThemeToggle(){
  const [dark, setDark] = useState<boolean>(()=>{
    try{ return (localStorage.getItem(KEY)||"dark")==="dark"; }catch{ return true; }
  });
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", dark);
    try{ localStorage.setItem(KEY, dark?"dark":"light"); }catch{}
  },[dark]);
  return (
    <button aria-label="Toggle theme" onClick={()=>setDark(v=>!v)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-accent">
      {dark? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
    </button>
  );
}
