import React, { useState } from "react";
import { createGroup } from "@/lib/group-store";
export default function GroupCreatorPanel() {
  const [groupName, setGroupName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div style={{ padding: 12 }}>
      {" "}
      <div style={{ fontWeight: 800, marginBottom: 8 }}>
        Create Group (v1)
      </div>{" "}
      <div style={{ opacity: 0.7, marginBottom: 10 }}>
        {" "}
        Multi-day bookings live here. Events link to a Group.{" "}
      </div>{" "}
      <div style={{ display: "flex", gap: 8 }}>
        {" "}
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group Name (e.g., Crockett Bridal Shower)"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.2)",
          }}
        />{" "}
        <button
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.2)",
            background: "transparent",
          }}
          onClick={() => {
            if (!groupName.trim()) {
              setMsg("Group name required.");
              return;
            }
            const g = createGroup({ groupName: groupName.trim() });
            setMsg(`Created: ${g.groupName} (${g.groupId})`);
            setGroupName("");
          }}
        >
          {" "}
          Create{" "}
        </button>{" "}
      </div>{" "}
      {msg && <div style={{ marginTop: 10, opacity: 0.85 }}>{msg}</div>}{" "}
    </div>
  );
}
