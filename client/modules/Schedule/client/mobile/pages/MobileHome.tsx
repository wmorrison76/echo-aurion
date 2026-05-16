/** * MobileHome – a compact landing showing KPI + quick links. * Role-gated: EMPLOYEE sees Ack + next shift; MGR sees KPI + rollup. */
import React from "react";
import { KPIHeader } from "../../components/kpi/KPIHeader";
import { DeptAckRollup } from "../../components/acks/DeptAckRollup";
import { AcknowledgeButton } from "../../components/acks/AcknowledgeButton";
export const MobileHome: React.FC<{
  org_id: string;
  outlet_id: string;
  dept_id: string;
  week_start: string;
  employee_id: string;
  role?: "EMPLOYEE" | "DEPT_MGR" | "GM" | "ADMIN";
}> = ({
  org_id,
  outlet_id,
  dept_id,
  week_start,
  employee_id,
  role = "EMPLOYEE",
}) => {
  const isMgr = ["DEPT_MGR", "GM", "ADMIN"].includes(role);
  return (
    <div className="space-y-3 pb-4">
      {" "}
      {isMgr && (
        <>
          {" "}
          <KPIHeader
            org_id={org_id}
            outlet_id={outlet_id}
            dept_id={dept_id}
            week_start={week_start}
          />{" "}
          <DeptAckRollup
            outlet_id={outlet_id}
            dept_id={dept_id}
            week_start={week_start}
          />{" "}
        </>
      )}{" "}
      {!isMgr && (
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
          {" "}
          <div className="text-sm text-gray-300 mb-3">This Week</div>{" "}
          <AcknowledgeButton
            org_id={org_id}
            outlet_id={outlet_id}
            dept_id={dept_id}
            week_start={week_start}
            employee_id={employee_id}
          />{" "}
          <div className="text-xs text-muted-foreground mt-3">
            {" "}
            Tap"Acknowledge" to confirm you've received the published
            schedule.{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
};
