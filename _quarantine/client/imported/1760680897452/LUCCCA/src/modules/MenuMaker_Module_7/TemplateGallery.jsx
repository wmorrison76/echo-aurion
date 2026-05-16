
import React from 'react';

export default function TemplateGallery() {
  return (
    <div className="border p-4 rounded bg-white shadow mb-4">
      <h2 className="font-semibold text-lg mb-2">Template Gallery</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-gray-100 flex items-center justify-center">Template 1</div>
        <div className="h-32 bg-gray-100 flex items-center justify-center">Template 2</div>
      </div>
    </div>
  );
}
