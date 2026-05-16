import React from 'react';

const cakeFlavors = ['Vanilla', 'Chocolate', 'Red Velvet', 'Lemon', 'Carrot'];
const fillings = ['Strawberry', 'Chocolate Ganache', 'Lemon Curd', 'Raspberry', 'Cream Cheese'];
const icings = ['Buttercream', 'Fondant', 'Whipped Cream', 'Ganache', 'Cream Cheese Frosting'];

export default function FlavorBuilder({ selected, setSelected }) {
  const updateSelection = (category, value) => {
    setSelected((prev) => ({ ...prev, [category]: value }));
  };

  return (
    <div className="bg-white p-6 rounded shadow text-gray-800">
      <h2 className="text-2xl font-bold mb-4">🧁 Flavor Builder</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cake Flavors */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Cake Flavor</h3>
          {cakeFlavors.map((flavor) => (
            <button
              key={flavor}
              onClick={() => updateSelection('flavor', flavor)}
              className={`block w-full px-3 py-2 mb-2 rounded border text-sm text-left
                ${selected.flavor === flavor ? 'bg-rose-100 border-rose-400' : 'border-gray-300 hover:bg-gray-100'}
              `}
            >
              {flavor}
            </button>
          ))}
        </div>

        {/* Fillings */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Filling</h3>
          {fillings.map((fill) => (
            <button
              key={fill}
              onClick={() => updateSelection('filling', fill)}
              className={`block w-full px-3 py-2 mb-2 rounded border text-sm text-left
                ${selected.filling === fill ? 'bg-rose-100 border-rose-400' : 'border-gray-300 hover:bg-gray-100'}
              `}
            >
              {fill}
            </button>
          ))}
        </div>

        {/* Icings */}
        <div>
          <h3 className="font-semibold text-sm mb-2">Icing</h3>
          {icings.map((ice) => (
            <button
              key={ice}
              onClick={() => updateSelection('icing', ice)}
              className={`block w-full px-3 py-2 mb-2 rounded border text-sm text-left
                ${selected.icing === ice ? 'bg-rose-100 border-rose-400' : 'border-gray-300 hover:bg-gray-100'}
              `}
            >
              {ice}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
