/**
 * useEchoOrb.ts
 * ----------------------------------------------------------------------------
 * State machine for the orb's visual state and the drawer's open/closed
 * status. Centralized so multiple consumers (orb, drawer, hint cards,
 * voice) all read the same truth.
 *
 * Drawer mode:
 *   The drawer can open in three modes — compose, critique, generate.
 *   Mode is part of the orb store because some entries (e.g., a hint
 *   card "Show me") should both open the drawer AND set the mode in
 *   one tick to avoid flicker.
 * ----------------------------------------------------------------------------
 */

import { create } from 'zustand';
import type { OrbState } from '../components/EchoOrb/EchoOrbCanvas';

export type DrawerMode = 'compose' | 'critique' | 'generate';

interface EchoOrbStore {
  // Orb state
  orbState: OrbState;
  micAmplitude: number;
  setOrbState: (state: OrbState) => void;
  setMicAmplitude: (amp: number) => void;

  // Drawer state
  drawerOpen: boolean;
  drawerMode: DrawerMode;
  /** Optional context payload passed to the drawer when opened */
  drawerContext: unknown | null;

  openDrawer: (mode?: DrawerMode, context?: unknown) => void;
  closeDrawer: () => void;
  setDrawerMode: (mode: DrawerMode) => void;
}

export const useEchoOrb = create<EchoOrbStore>((set) => ({
  orbState: 'idle',
  micAmplitude: 0,
  setOrbState: (state) => set({ orbState: state }),
  setMicAmplitude: (amp) => set({ micAmplitude: amp }),

  drawerOpen: false,
  drawerMode: 'compose',
  drawerContext: null,

  openDrawer: (mode, context) =>
    set((s) => ({
      drawerOpen: true,
      drawerMode: mode ?? s.drawerMode,
      drawerContext: context ?? null,
    })),
  closeDrawer: () => set({ drawerOpen: false, drawerContext: null }),
  setDrawerMode: (mode) => set({ drawerMode: mode }),
}));
