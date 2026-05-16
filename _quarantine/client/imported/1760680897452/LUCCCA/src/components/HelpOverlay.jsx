import React from "react";

const HelpOverlay = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full relative overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">How to Use the Recipe Builder</h2>
        <ul className="space-y-3 text-gray-700 text-sm">
          <li>📝 Type in your recipe name at the top.</li>
          <li>🥕 Fill out each row for ingredients, quantity, unit, and prep method.</li>
          <li>⚙️ Use the “Common Prep Methods” panel to quickly insert standard techniques.</li>
          <li>💡 Yield % will auto-fill based on the selected prep method.</li>
          <li>📄 Prep Notes are saved automatically so you never lose your work.</li>
        </ul>
        <div className="mt-6">
          <img
            src="/assets/help-example.jpg"
            alt="Help Example"
            className="w-full rounded border shadow"
          />
        </div>
      </div>
    </div>
  );
};

export default HelpOverlay;
