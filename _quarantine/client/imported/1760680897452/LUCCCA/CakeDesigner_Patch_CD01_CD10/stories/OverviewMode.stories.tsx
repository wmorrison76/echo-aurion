import React from 'react';
import { OverviewMode } from '../src/OverviewMode';

export default {
  title: 'CakeDesigner/OverviewMode',
  component: OverviewMode,
};

export const Default = () => {
  // dummy rig
  const rig = { goTo: () => {} } as any;
  return <OverviewMode rig={rig} />;
};
