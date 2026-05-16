import React, { useState } from "react";
import EchoGridSidebar from "../components/EchoGridSidebar";

export default function SidebarTestPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setDarkMode] = useState(true);

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-black' : 'bg-gray-100'}`}>
      <EchoGridSidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setSidebarOpen(prev => !prev)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setDarkMode(prev => !prev)}
      />
      <main className="flex-1 p-10 text-white">
        <h1 className="text-4xl font-bold">🧪 Sidebar Test Page</h1>
      </main>
    </div>
  );
}
