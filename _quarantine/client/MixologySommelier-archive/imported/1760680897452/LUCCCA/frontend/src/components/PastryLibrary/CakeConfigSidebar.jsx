// src/components/PastryLibrary/CakeConfigSidebar.jsx
import React from 'react';

const eventTypes = [
  'Wedding', 'Birthday', 'Baby Shower', 'Corporate', 'Anniversary',
  'Bar Mitzvah', 'Bat Mitzvah', 'Graduation', 'Quinceañera',
  'Holiday', 'Bridal Shower', 'Engagement', 'Retirement', 'Just Because'
];

export default function CakeConfigSidebar({
  eventType, setEventType,
  guestCount, setGuestCount,
  theme, setTheme,
  notes, setNotes
}) {
  return (
    <div className="w-72 bg-white border-r border-gray-200 p-6 shadow-inner rounded-tr-lg rounded-br-lg">
      <h2 className="text-xl font-bold mb-4 text-zinc-700">Cake Details</h2>

      <label className="block mb-2 text-sm font-medium text-zinc-600">Event Type</label>
      <select
        value={eventType}
        onChange={(e) => setEventType(e.target.value)}
        className="w-full mb-4 p-2 border rounded"
      >
        <option value="">Select</option>
        {eventTypes.map((type) => (
          <option key={type}>{type}</option>
        ))}
      </select>

      <label className="block mb-2 text-sm font-medium text-zinc-600">Guest Count</label>
      <input
        type="number"
        value={guestCount}
        onChange={(e) => setGuestCount(Number(e.target.value))}
        className="w-full mb-4 p-2 border rounded"
        placeholder="e.g. 75"
      />

      <label className="block mb-2 text-sm font-medium text-zinc-600">Theme</label>
      <input
        type="text"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full mb-4 p-2 border rounded"
        placeholder="Winter Wonderland, Tropical..."
      />

      <label className="block mb-2 text-sm font-medium text-zinc-600">Special Notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full p-2 border rounded"
        rows={3}
        placeholder="e.g. Contains nuts, vegan option..."
      />
    </div>
  );
}
