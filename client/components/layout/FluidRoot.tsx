import React from "react";
import { Outlet } from "react-router-dom";
import CommandSidebar from "./CommandSidebar";

export default function FluidRoot() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#0b0f14",
        color: "#e5faff",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <CommandSidebar />

      {/* Main Application Surface */}
      <main
        id="luccca-main-surface"
        style={{
          flex: 1,
          position: "relative",
          overflow: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
