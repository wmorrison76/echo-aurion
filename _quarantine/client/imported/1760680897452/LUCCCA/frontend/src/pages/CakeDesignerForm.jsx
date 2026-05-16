import React from 'react';
import CakeFormSection from '../components/CakeFormSection';
import CakeCanvas from '../components/CakeCanvas';

export default function CakeDesignerForm() {
  return (
    <div className="cake-designer-form-page">
      <h1 className="text-2xl font-bold mb-4">Cake Designer</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <CakeFormSection title="Base Layers">
            <p>Layer size, flavor, height selector here.</p>
          </CakeFormSection>
          <CakeFormSection title="Fillings">
            <p>Fillings dropdown and options here.</p>
          </CakeFormSection>
          <CakeFormSection title="Supports">
            <p>Calculated automatically or manual override.</p>
          </CakeFormSection>
        </div>
        <div>
          <CakeCanvas />
        </div>
      </div>
    </div>
  );
}
