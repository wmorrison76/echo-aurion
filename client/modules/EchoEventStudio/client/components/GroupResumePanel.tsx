import React, { useEffect, useState } from "react";
import { osBus } from "@/lib/os-bus";
import { listGroups } from "@/lib/group-store";
import type { GroupBooking } from "@/../shared/types/group";
import type { CalendarEvent } from "@/../shared/types/calendar";
import { listBeosByEvent } from "@/lib/beo-store";
async function fetchAllEvents(): Promise<CalendarEvent[]> {
  const res = await fetch("/api/calendar/events", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch events");
  const data = await res.json(); // assume array return (Array.isArray(data) ? data : (data.events ?? [])).map((e: any) => ({ id: e.id, title: e.title ?? e.name ??"Untitled", start: e.start ?? e.startTime ??"", end: e.end ?? e.endTime ??"", locationName: e.locationName ?? e.location ?? e.outletName, room: e.room, exp: e.exp ?? e.counts?.exp, gtd: e.gtd ?? e.counts?.gtd, set: e.set ?? e.counts?.set, groupId: e.groupId, groupName: e.groupName, }));
}
export default function GroupResumePanel() {
  const [groups, setGroups] = useState<GroupBooking[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setGroups(listGroups());
    fetchAllEvents()
      .then(setEvents)
      .catch((e) => setError(e?.message ?? "Failed to load events"));
  }, []);
  const selectedGroup = selectedGroupId
    ? groups.find((g) => g.groupId === selectedGroupId)
    : null;
  const groupEvents = selectedGroupId
    ? events.filter((e) => e.groupId === selectedGroupId)
    : [];
  return (
    <div style={{ padding: 12 }}>
      {" "}
      <div style={{ fontWeight: 800, marginBottom: 8 }}>
        Group Resume (v1)
      </div>{" "}
      <div style={{ opacity: 0.7, marginBottom: 10 }}>
        {" "}
        Aggregates all events + BEOs under one group (multi-day bookings).{" "}
      </div>{" "}
      {error && (
        <div style={{ marginBottom: 10 }}>
          {" "}
          <strong>Error:</strong> {error}{" "}
        </div>
      )}{" "}
      <div style={{ display: "flex", gap: 10 }}>
        {" "}
        <div
          style={{
            width: 320,
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 10,
          }}
        >
          {" "}
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Groups</div>{" "}
          {groups.length === 0 ? (
            <div style={{ opacity: 0.7 }}>
              {" "}
              No groups yet. Create one in Group Creator.{" "}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {" "}
              {groups.map((g) => (
                <button
                  key={g.groupId}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.15)",
                    background:
                      selectedGroupId === g.groupId
                        ? "rgba(0,0,0,0.06)"
                        : "transparent",
                  }}
                  onClick={() => setSelectedGroupId(g.groupId)}
                >
                  {" "}
                  <div style={{ fontWeight: 700 }}>{g.groupName}</div>{" "}
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {g.groupId}
                  </div>{" "}
                </button>
              ))}{" "}
            </div>
          )}{" "}
        </div>{" "}
        <div
          style={{
            flex: 1,
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 10,
          }}
        >
          {" "}
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {" "}
            {selectedGroup
              ? `Group: ${selectedGroup.groupName}`
              : "Select a group"}{" "}
          </div>{" "}
          {selectedGroup && (
            <>
              {" "}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {" "}
                <button
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "transparent",
                  }}
                  onClick={() =>
                    osBus.emit("ui:open_panel", {
                      panelKey: "group-resume-print",
                      payload: {
                        groupId: selectedGroup.groupId,
                        events: groupEvents,
                      },
                      source: "GroupResumePanel",
                    })
                  }
                >
                  {" "}
                  Print Group Resume{" "}
                </button>{" "}
              </div>{" "}
              <div style={{ opacity: 0.8, marginBottom: 10 }}>
                {" "}
                <strong>Events:</strong> {groupEvents.length}{" "}
              </div>{" "}
              {groupEvents.length === 0 ? (
                <div style={{ opacity: 0.7 }}>
                  {" "}
                  No events linked to this group yet. Next step will add"Assign
                  to Group" in Event Editor.{" "}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {" "}
                  {groupEvents.map((e) => {
                    const beos = listBeosByEvent(e.id);
                    return (
                      <div
                        key={e.id}
                        style={{
                          border: "1px solid rgba(0,0,0,0.12)",
                          borderRadius: 12,
                          padding: 10,
                        }}
                      >
                        {" "}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          {" "}
                          <div style={{ fontWeight: 700 }}>{e.title}</div>{" "}
                          <div style={{ opacity: 0.7, fontSize: 12 }}>
                            {" "}
                            {e.start} → {e.end}{" "}
                          </div>{" "}
                        </div>{" "}
                        <div style={{ marginTop: 6, opacity: 0.85 }}>
                          {" "}
                          <div>
                            {" "}
                            <strong>Outlet:</strong> {e.locationName ?? "—"}
                            {""} {e.room ? ` / ${e.room}` : ""}{" "}
                          </div>{" "}
                          <div>
                            {" "}
                            <strong>Counts:</strong> EXP {e.exp ?? "—"} | GTD
                            {""} {e.gtd ?? "—"} | SET {e.set ?? "—"}{" "}
                          </div>{" "}
                          <div>
                            {" "}
                            <strong>BEOs:</strong> {beos.length}{" "}
                          </div>{" "}
                        </div>{" "}
                      </div>
                    );
                  })}{" "}
                </div>
              )}{" "}
            </>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
