// ============================
// 8. /src/components/EchoCore/MissionControl/MissionControl.jsx
// ============================
import React from "react";
import useLiveFinanceData from "../../../hooks/useLiveFinanceData";
import useLiveHospitalityData from "../../../hooks/useLiveHospitalityData";
import AlertStack from "./AlertStack";
import PiPVideoTile from "../interaction/PiPVideoTile";

// [TEAM LOG: Mission Control] - Real-time ops dashboard
export default function MissionControl() {
const finance = useLiveFinanceData();
const hospitality = useLiveHospitalityData();

return (

Mission Control



Finance Stream

{JSON.stringify(finance, null, 2)}



Hospitality Stream

{JSON.stringify(hospitality, null, 2)}







);
}