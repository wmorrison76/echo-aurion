import React, { useState } from "react";

export default function RightSidebar() {
  const [status, setStatus] = useState("active");
  const [tags, setTags] = useState("");
  const [allergens, setAllergens] = useState([]);
  const [image, setImage] = useState(null);
  const [notes, setNotes] = useState("");

  const allergenList = [
    "Gluten", "Dairy", "Eggs", "Soy", "Nuts", "Shellfish",
    "Sesame", "Fish", "Corn", "Mustard", "Peanuts", "Sulphites"
  ];

  const toggleAllergen = (item) => {
    if (allergens.includes(item)) {
      setAllergens(allergens.filter(a => a !== item));
    } else {
      setAllergens([...allergens, item]);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Status */}
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="active">Active</option>
          <option value="draft">In Development</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <input
          type="text"
          placeholder="e.g. vegan, gluten-free"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Allergens */}
      <div>
        <label className="block text-sm font-medium mb-2">Allergens</label>
        <div className="grid grid-cols-2 gap-2">
          {allergenList.map((allergen) => (
            <label key={allergen} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={allergens.includes(allergen)}
                onChange={() => toggleAllergen(allergen)}
              />
              <span>{allergen}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium mb-1">Main Image</label>
        <input type="file" onChange={handleImageUpload} />
        {image && (
          <img
            src={image}
            alt="Preview"
            className="mt-2 w-full h-40 object-cover rounded border"
          />
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Internal Notes</label>
        <textarea
          placeholder="Version control, chef notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded h-20"
        />
      </div>
    </div>
  );
}
