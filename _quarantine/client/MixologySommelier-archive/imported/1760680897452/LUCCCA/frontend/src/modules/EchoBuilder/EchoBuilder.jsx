import React, { useState } from "react";
import SideNav from "./SideNav";
import PageRenderer from "./PageRenderer";

export default function EchoBuilder() {
  const [activePage, setActivePage] = useState("Pages");

  return (
    <div className="flex h-screen w-screen bg-[#111] text-white">
      <SideNav activePage={activePage} setActivePage={setActivePage} />
      <PageRenderer activePage={activePage} />
    </div>
  );
}
