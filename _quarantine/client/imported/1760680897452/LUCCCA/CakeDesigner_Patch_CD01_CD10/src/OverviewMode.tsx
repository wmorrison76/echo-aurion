/**
 * LUCCCA | CD-08 (PATCH V1)
 */
import React from 'react';
import { CameraRig } from './CameraRig';

export const OverviewMode: React.FC<{ rig: CameraRig }> = ({ rig }) => {
  return (
    <button
      className="px-3 py-2 bg-purple-600 text-white rounded-md shadow"
      onClick={() => rig.goTo('overview', 12)}
    >
      Overview Mode
    </button>
  );
};
