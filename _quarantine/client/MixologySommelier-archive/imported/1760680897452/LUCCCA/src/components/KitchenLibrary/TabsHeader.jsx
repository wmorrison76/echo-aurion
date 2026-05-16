import React from 'react';

export default function TabsHeader({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex border-b relative z-10 justify-end space-x-0">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 -mb-px text-sm font-semibold transition-all duration-150 ease-in-out ${
            activeTab === tab
              ? 'bg-white border border-b-transparent rounded-t shadow-sm text-black'
              : 'bg-pink-100 text-pink-600 border border-transparent hover:bg-pink-200'
          } ${i !== 0 ? '-ml-2' : ''} rounded-t-md`}
          style={{
            zIndex: activeTab === tab ? 20 : 10,
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
