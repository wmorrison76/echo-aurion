import React from "react";
import SideNav from "./SideNav";
import PageRenderer from "./PageRenderer";

export default function EchoBuilder() {
  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <SideNav />
      <div className="flex-1 p-6 overflow-auto">
        <PageRenderer />
      </div>
    </div>
  );
}
