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

import { create } from 'zustand';

export type AvatarPersona = 'man' | 'woman' | 'binary';
export type AvatarEmotion = 'neutral' | 'happy' | 'sad' | 'thinking';

interface AvatarState {
  selected: AvatarPersona;
  isTalking: boolean;
  mouthOpen: number; // 0..1
  emotion: AvatarEmotion;
  setSelected: (p: AvatarPersona) => void;
  setIsTalking: (t: boolean) => void;
  setMouthOpen: (v: number) => void;
  setEmotion: (e: AvatarEmotion) => void;
}

export const useAvatarStore = create<AvatarState>((set) => ({
  selected: 'binary',
  isTalking: false,
  mouthOpen: 0,
  emotion: 'neutral',
  setSelected: (p) => set({ selected: p }),
  setIsTalking: (t) => set({ isTalking: t }),
  setMouthOpen: (v) => set({ mouthOpen: Math.max(0, Math.min(1, v)) }),
  setEmotion: (e) => set({ emotion: e }),
}));
