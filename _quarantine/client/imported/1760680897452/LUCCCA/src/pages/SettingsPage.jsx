import React from "react";

const SettingsPage = () => {
  return (
    
    <div className="mt-6 p-4 border rounded shadow-sm bg-gray-50">
  <h3 className="text-lg font-bold mb-1">Legacy Mode Tribute</h3>
  <p className="text-gray-700 mb-1">{ECHO.builtFor}</p>
  <p className="text-sm italic text-gray-500">{ECHO.tribute}</p>
  <footer className="text-xs text-center text-gray-400 mt-8">
  Built for Time. Built for Legacy. Built for Nicholas & Lucca. Inspired by Camila.
</footer>

</div>

  );
};

export default SettingsPage;

