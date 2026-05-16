
import React from 'react';
import { SystemStatusPane } from './SystemStatusPane';

export default {
  title: 'Panes/SystemStatusPane',
  component: SystemStatusPane,
};

export const OnlineFull = () => <SystemStatusPane perfMode="full" online={true} />;
export const OfflineLight = () => <SystemStatusPane perfMode="light" online={false} />;
