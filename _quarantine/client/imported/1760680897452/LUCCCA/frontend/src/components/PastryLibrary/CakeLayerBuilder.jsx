// src/components/PastryLibrary/CakeLayerBuilder.jsx
import React from 'react';

const flavors = ['Vanilla', 'Chocolate', 'Red Velvet', 'Lemon', 'Almond', 'Coffee', 'Carrot'];
const fillings = ['Strawberry', 'Raspberry', 'Ganache', 'Buttercream', 'Custard', 'Fruit Jam'];
const frostings = ['Buttercream', 'Fondant', 'Cream Cheese', 'Ganache'];

export default function CakeLayerBuilder({ layers, setLayers }) {
  const updateLayer = (index, field, value) => {
    const updated = [...layers];
    updated[index][field] = value;
    setLayers(updated);
  };

  const addLayer = () => {
    if (layers.length < 10) {
      setLayers([...layers, { flavor: '', filling: '', frosting: '' }]);
    }
  };

  const removeLayer = (index) => {
    const updated = layers.filter((_, i) => i !== index);
    setLayers(updated);
  };

  return (
    <div className="w-full max-w-3xl mt-8">
      <h3 className="text-xl font-semibold text-zinc-700 mb-4">🎂 Build Your Layers</h3>
      {layers.map((layer, i) => (
        <div key={i} className="mb-4 p-4 border rounded bg-white shadow-sm">
          <div className="mb-2 font-medium text-sm text-zinc-600">Layer {i + 1}</div>

          <div className="flex flex-wrap gap-4">
            <select
              value={layer.flavor}
              onChange={(e) => updateLayer(i, 'flavor', e.target.value)}
              className="p-2 border rounded w-40"
            >
              <option value="">Flavor</option>
              {flavors.map((f) => <option key={f}>{f}</option>)}
            </select>

            <select
              value={layer.filling}
              onChange={(e) => updateLayer(i, 'filling', e.target.value)}
              className="p-2 border rounded w-40"
            >
              <option value="">Filling</option>
              {fillings.map((f) => <option key={f}>{f}</option>)}
            </select>

            <select
              value={layer.frosting}
              onChange={(e) => updateLayer(i, 'frosting', e.target.value)}
              className="p-2 border rounded w-40"
            >
              <option value="">Frosting</option>
              {frostings.map((f) => <option key={f}>{f}</option>)}
            </select>

            {layers.length > 1 && (
              <button
                onClick={() => removeLayer(i)}
                className="text-red-500 hover:underline text-sm"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={addLayer}
        className="mt-2 px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-800"
      >
        ➕ Add Layer
      </button>
    </div>
  );
}
