import React from "react";
import { X } from "lucide-react";
import GlowyDeskAuditPanel from "@/apps/scheduler-ui/blocks/GlowyDeskAuditPanel";
import EventFeed from "./EventFeed";
export default function RightDrawerPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={`fixed top-11 bottom-10 right-0 w-[min(340px,calc(100vw-1rem))] border-l bg-background transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      {" "}
      <div className="h-10 border-b flex items-center justify-between px-2">
        <div className="font-medium text-sm">Right Drawer</div>
        <button className="p-1" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>{" "}
      <div className="space-y-2 overflow-auto px-2 py-2 h-[calc(100%-2.5rem)]">
        {" "}
        <EventFeed /> <GlowyDeskAuditPanel />{" "}
      </div>{" "}
    </aside>
  );
}
