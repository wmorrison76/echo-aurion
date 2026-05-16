/** * MobileShell – bottom-tab mobile layout * Tabs: Home, Schedule, Tips, Ack (role-gated) */
import React from "react";
import { MobileHome } from "./pages/MobileHome";
import { MySchedule } from "../components/self/MySchedule";
import { MyTips } from "../components/self/MyTips";
import { AcknowledgeButton } from "../components/acks/AcknowledgeButton";
type Tab = "HOME" | "SCHEDULE" | "TIPS" | "ACK";
export const MobileShell: React.FC<{
  org_id: string;
  outlet_id: string;
  dept_id: string;
  week_start: string;
  employee_id: string;
  role?: "EMPLOYEE" | "DEPT_MGR" | "GM" | "ADMIN";
}> = (props) => {
  const [tab, setTab] = React.useState<Tab>("HOME"); // Role-gated tabs: employees don't see Tips, KPI, Reports const isMgr = ["DEPT_MGR","GM","ADMIN"].includes(props.role ||"EMPLOYEE"); const tabs: Array<[Tab, string]> = isMgr ? [ ["HOME","Home"], ["SCHEDULE","Schedule"], ["TIPS","Tips"], ["ACK","Ack"], ] : [ ["HOME","Home"], ["SCHEDULE","Schedule"], ["ACK","Ack"], ]; return ( <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col"> <div className="flex-1 p-3 overflow-auto"> {tab ==="HOME" && <MobileHome {...props} role={props.role} />} {tab ==="SCHEDULE" && ( <MySchedule employee_id={props.employee_id} week_start={props.week_start} /> )} {isMgr && tab ==="TIPS" && ( <MyTips employee_id={props.employee_id} start={props.week_start} end={props.week_start} /> )} {tab ==="ACK" && ( <div className="flex items-center justify-center min-h-[60vh]"> <AcknowledgeButton {...props} /> </div> )} </div> {/* Bottom tabs */} <nav className="sticky bottom-0 bg-black/60 backdrop-blur border-t border-white/10"> <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}> {tabs.map(([id, label]) => ( <button key={id} onClick={() => setTab(id)} className={`py-3 text-sm transition-colors ${ tab === id ?"text-white bg-background" :"text-gray-400 hover:text-white" }`} > {label} </button> ))} </div> </nav> </div> );
};
