import React from 'react';

export function FormInput({ label, value, onChange, type = 'text' }) {
  return (
    <div className="form-input mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full p-2 border border-gray-300 rounded"
      />
    </div>
  );
}
