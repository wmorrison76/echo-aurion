import React from 'react';

export function FormFieldGroup({ label, children }) {
  return (
    <div className="form-field-group mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
