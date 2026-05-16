/**
* LUCCCA | EF-04..EF-05
* File: <absolute path from repo root>
* Created: 2025-07-27 by AI
* Depends On: react, zustand, framer-motion, @react-three/fiber, @react-three/drei
* Exposes: useVoiceSync, EchoAvatarPanel
* Location Notes: Consumed by Echo Assistant panel / Fluid Whiteboard
* Tests: packages/echoscope/tests/avatar
* ADR: docs/adr/ADR-echo-avatars.md
*/

import React from 'react';
import { AvatarSelector } from '../../components/avatar/AvatarSelector';
import { AvatarLoader3D } from '../../components/avatar/AvatarLoader3D';
import { useVoiceSync } from '../../hooks/useVoiceSync';
import { useAvatarStore } from '../../hooks/useAvatarStore';
import { motion } from 'framer-motion';

/**
 * EchoAvatarPanel
 * Dockable panel that mounts selector + 3D avatar + voice sync.
 */
export const EchoAvatarPanel: React.FC<{ enableVoice?: boolean }> = ({ enableVoice = true }) => {
  useVoiceSync(enableVoice);
  const { isTalking, emotion } = useAvatarStore();

  return (
    <div className="flex flex-col w-full h-full bg-background text-foreground">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Echo Faces &amp; Identity</h2>
      </div>
      <div className="p-4">
        <AvatarSelector />
      </div>
      <div className="flex-1 min-h-0">
        <div className="h-full w-full">
          <AvatarLoader3D />
        </div>
      </div>
      <motion.div
        className="p-2 text-sm opacity-70"
        animate={{ opacity: isTalking ? 1 : 0.6 }}
        transition={{ duration: 0.2 }}
      >
        <span>Status:</span> {isTalking ? 'Talking' : 'Idle'} — Emotion: {emotion}
      </motion.div>
    </div>
  );
};
