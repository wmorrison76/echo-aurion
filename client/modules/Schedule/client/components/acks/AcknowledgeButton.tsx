/** * EMPLOYEE one-click Acknowledge button. * Writes to publish_acknowledgements and disables after success. */
import React from "react";
import { Button } from "@/components/ui/button";
export const AcknowledgeButton: React.FC<{
  org_id: string;
  outlet_id: string;
  dept_id: string;
  week_start: string; // YYYY-MM-DD employee_id: string; // current user id
}> = ({ org_id, outlet_id, dept_id, week_start, employee_id }) => {
  const [ok, setOk] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  async function ack() {
    setLoading(true);
    try {
      const r = await fetch("/api/acks/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id,
          outlet_id,
          dept_id,
          week_start,
          employee_id,
        }),
      });
      if (r.ok) setOk(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button
      onClick={ack}
      disabled={ok || loading}
      className={`rounded-xl px-4 py-2 text-sm ${ok ? "bg-emerald-700 hover:bg-emerald-700" : "bg-primary hover:opacity-90"} text-white`}
      title={ok ? "Acknowledged" : "Acknowledge published schedule"}
    >
      {" "}
      {ok ? "✔ Acknowledged" : loading ? "Acknowledging…" : "Acknowledge"}{" "}
    </Button>
  );
};
