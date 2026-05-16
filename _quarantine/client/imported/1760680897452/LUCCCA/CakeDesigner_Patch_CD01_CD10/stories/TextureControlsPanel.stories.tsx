import React from 'react';
import { TextureControlsPanel } from '../src/TextureControlsPanel';

export default {
  title: 'CakeDesigner/TextureControlsPanel',
  component: TextureControlsPanel,
};

export const Default = () => <TextureControlsPanel onIntensityChange={() => {}} />;
