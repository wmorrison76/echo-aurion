/**
 * LUCCCA | CD-08
 * OverviewMode: UI component to switch camera to 'overview' and show high-level scene snapshot.
 */
import React from 'react';
import { CameraRig } from './CameraRig';

type Props = {
  rig: CameraRig;
};

export const OverviewMode: React.FC<Props> = ({ rig }) => {
  const onClick = () => {
    rig.goTo('overview', 12);
  };

  return (
    <button
      className="px-3 py-2 bg-purple-600 text-white rounded-md shadow"
      onClick={onClick}
    >
      Overview Mode
    </button>
  );
};
