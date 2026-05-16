import React, { useState } from 'react';
import CakeCanvas from '../components/CakeCanvas';
import CakeDesignSummary from '../components/CakeDesignSummary';
import { FormButton } from '../components/FormButton';

export default function CakeDesignerExport() {
  const [exportStatus, setExportStatus] = useState('');

  const sampleDesign = {
    base: '8-inch Vanilla',
    fillings: ['Raspberry Jam', 'Whipped Cream'],
    crumbCoat: true,
    coating: 'Fondant',
    supports: 'Internal Dowels',
    decorations: ['Gold Leaf', 'Marble Effect'],
  };

  const handleExport = () => {
    // Placeholder for backend export connection
    setExportStatus('Exported successfully to Recipe Library');
  };

  return (
    <div className="cake-designer-export-page">
      <h1 className="text-2xl font-bold mb-4">Cake Designer Export</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CakeCanvas />
        <CakeDesignSummary designData={sampleDesign} />
      </div>
      <FormButton label="Export Design to Recipe Library" onClick={handleExport} />
      {exportStatus && <p className="mt-4">{exportStatus}</p>}
    </div>
  );
}
