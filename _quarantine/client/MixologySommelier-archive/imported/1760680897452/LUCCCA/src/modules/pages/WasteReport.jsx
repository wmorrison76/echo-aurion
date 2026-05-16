import React, { useState } from "react";

export default function WasteReport() {
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({
    date: "",
    item: "",
    qty: "",
    reason: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.date && form.item && form.qty && form.reason) {
      setLogs([...logs, { ...form }]);
      setForm({ date: "", item: "", qty: "", reason: "" });
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Waste Report</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4 mb-6">
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="border px-3 py-2 rounded"
        />
        <input
          type="text"
          name="item"
          placeholder="Item Name"
          value={form.item}
          onChange={handleChange}
          className="border px-3 py-2 rounded"
        />
        <input
          type="number"
          name="qty"
          placeholder="Quantity"
          value={form.qty}
          onChange={handleChange}
          className="border px-3 py-2 rounded"
        />
        <input
          type="text"
          name="reason"
          placeholder="Reason"
          value={form.reason}
          onChange={handleChange}
          className="border px-3 py-2 rounded"
        />
        <button
          type="submit"
          className="col-span-4 bg-blue-600 text-white py-2 px-4 rounded shadow hover:bg-blue-700"
        >
          Add Entry
        </button>
      </form>
      <div className="space-y-2">
        {logs.map((log, idx) => (
          <div key={idx} className="border p-3 rounded shadow-sm bg-gray-50">
            <div><strong>Date:</strong> {log.date}</div>
            <div><strong>Item:</strong> {log.item}</div>
            <div><strong>Qty:</strong> {log.qty}</div>
            <div><strong>Reason:</strong> {log.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
