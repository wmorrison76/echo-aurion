// src/components/PastryLibrary/CakeDesigner.jsx
import React, { useState } from 'react';
import CakeConfigSidebar from './CakeConfigSidebar';
import CakeLayerBuilder from './CakeLayerBuilder';
import CakePreview from './CakePreview';
import CakeSubmitPanel from './CakeSubmitPanel';

export default function CakeDesigner() {
  const [eventType, setEventType] = useState('');
  const [guestCount, setGuestCount] = useState(0);
  const [layers, setLayers] = useState([
    { flavor: '', filling: '', frosting: '' }
  ]);
  const [theme, setTheme] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-gray-100 to-white font-sans">
      {/* Sidebar */}
      <CakeConfigSidebar
        eventType={eventType}
        setEventType={setEventType}
        guestCount={guestCount}
        setGuestCount={setGuestCount}
        theme={theme}
        setTheme={setTheme}
        notes={notes}
        setNotes={setNotes}
      />

      {/* Center: Cake Preview */}
      <div className="flex-1 px-8 py-6 flex flex-col items-center overflow-auto">
        <h1 className="text-3xl font-bold text-zinc-800 mb-6 tracking-tight">
          EchoCanvas: Custom Cake Designer 🍰
        </h1>
        <CakePreview layers={layers} />
        <CakeLayerBuilder layers={layers} setLayers={setLayers} />
        <CakeSubmitPanel
          layers={layers}
          guestCount={guestCount}
          eventType={eventType}
          theme={theme}
          notes={notes}
        />
      </div>
    </div>
  );
}
