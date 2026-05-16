
import React from 'react';
import { LayerManager } from '../LayerManager';

export default {
  title: 'Whiteboard/LayerManager',
  component: LayerManager,
};

export const Default = () => (
  <LayerManager>
    <div style={{ position: 'absolute', top: 10, left: 10 }}>Top layer child</div>
  </LayerManager>
);
