// ============================
// 9. /src/components/EchoCore/MissionControl/AlertStack.jsx
// ============================
import React from "react";

// [TEAM LOG: Mission Control] - Live alerts for anomalies
export default function AlertStack({ finance, hospitality }) {
const alerts = [];
if (finance && finance.total && finance.total > 50000) {
alerts.push("High revenue spike detected.");
}
if (hospitality && hospitality.guests && hospitality.guests > 200) {
alerts.push("High guest volume detected.");
}

return (

{alerts.map((alert, idx) => (

{alert}

))}
{alerts.length === 0 && (
No current alerts.
)}

);
}