/**
* LUCCCA | EF
* File: <absolute path from repo root>
* Created: 2025-07-27 by AI
* Depends On: react, tailwindcss, framer-motion, @react-three/fiber
* Exposes: AvatarSelector, AvatarLoader3D, AvatarAnimator
* Location Notes: Used in Echo Assistant for avatar identity management
* Tests: packages/echoscope/tests/avatar
* ADR: ADR-echo-avatars.md
*/


import React from 'react';
import { Button } from '@/components/ui/button';
import { useAvatarStore } from '../../hooks/useAvatarStore';

/**
 * AvatarSelector Component
 * Allows user to choose avatar persona (man, woman, binary).
 */
export const AvatarSelector: React.FC = () => {
  const { selected, setSelected } = useAvatarStore();
  const avatars = ['man', 'woman', 'binary'];

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-lg font-semibold">Choose Avatar</h3>
      <div className="flex space-x-2">
        {avatars.map((a) => (
          <Button
            key={a}
            variant={selected === a ? 'default' : 'outline'}
            onClick={() => setSelected(a)}
          >
            {a}
          </Button>
        ))}
      </div>
    </div>
  );
};
