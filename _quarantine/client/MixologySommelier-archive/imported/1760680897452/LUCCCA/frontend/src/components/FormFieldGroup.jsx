import React from 'react';

export function FormFieldGroup({ label, children }) {
  return (
    <div className="form-field-group mb-4">
      <label className="block mb-1 font-bold">{label}</label>
      {children}
    </div>
  );
}
