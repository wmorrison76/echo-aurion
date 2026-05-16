// PaneManager.stories.jsx
import React from 'react';
import PaneManager from './PaneManager';

export default {
  title: 'Whiteboard/PaneManager',
  component: PaneManager,
};

export const Default = () => (
  <PaneManager initialPanes={[{ x: 0, y: 0, width: 200, height: 150, content: 'Pane 1' }]} />
);
