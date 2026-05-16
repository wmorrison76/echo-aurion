import React, { useState } from 'react';

export default function DesignUpload() {
  const [image, setImage] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow text-gray-800">
      <h2 className="text-2xl font-bold mb-4">🎨 Upload Your Design</h2>
      <input type="file" accept="image/*" onChange={handleImageUpload} className="mb-4" />
      {image && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Preview:</p>
          <img src={image} alt="Uploaded design" className="mt-2 max-w-sm rounded shadow-md" />
        </div>
      )}
    </div>
  );
}
