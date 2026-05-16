// src/components/PrepMethodHelper.jsx
import React, { useState } from "react";

const defaultPrepMethods = [
  { name: "Julienne", yield: "85%" },
  { name: "Brunoise", yield: "83%" },
  { name: "Batonnet", yield: "87%" },
  { name: "Dice Small", yield: "85%" },
  { name: "Dice Medium", yield: "83%" },
  { name: "Dice Large", yield: "80%" },
  { name: "Chiffonade", yield: "90%" },
  { name: "Paysanne", yield: "84%" },
  { name: "Tournée", yield: "75%" },
  { name: "Mince", yield: "88%" },
  { name: "Rondelle", yield: "86%" },
  { name: "Concassé", yield: "80%" },
];

const PrepMethodHelper = ({ onSelect }) => {
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState({ name: "", yield: "" });

  const filtered = defaultPrepMethods.filter((method) =>
    method.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCustomAdd = () => {
    if (custom.name && custom.yield) {
      onSelect(custom.name);
      setCustom({ name: "", yield: "" });
    }
  };

  return (
    <div className="border rounded p-4 shadow-sm bg-white mt-6">
      <h2 className="text-lg font-semibold mb-3">Common Prep Methods</h2>

      <input
        type="text"
        placeholder="Search prep method..."
        className="w-full mb-3 p-2 border rounded shadow-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 mb-4 max-h-60 overflow-y-auto">
        {filtered.map((method, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(method.name)}
            className="text-left bg-gray-50 hover:bg-blue-100 px-2 py-1 rounded border"
          >
            <span className="font-medium">{method.name}</span>
            <span className="text-sm text-gray-600 float-right">{method.yield}</span>
          </button>
        ))}
      </div>

      <hr className="my-4" />

      <div className="mb-2 font-semibold">Custom Prep Method</div>
      <div className="flex flex-col md:flex-row gap-2 mb-2">
        <input
          type="text"
          placeholder={"e.g., Peeled, Seeded, 1/4\" dice"}
          className="flex-1 p-2 border rounded"
          value={custom.name}
          onChange={(e) => setCustom({ ...custom, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Yield %"
          className="w-24 p-2 border rounded"
          value={custom.yield}
          onChange={(e) => setCustom({ ...custom, yield: e.target.value })}
        />
      </div>
      <button
        onClick={handleCustomAdd}
        className="bg-blue-600 text-white px-3 py-2 rounded shadow w-full md:w-auto"
      >
        Add & Use Custom Method
      </button>
    </div>
  );
};

export default PrepMethodHelper;
