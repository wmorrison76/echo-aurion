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

import type { Meta, StoryObj } from '@storybook/react';
import { EchoAvatarPanel } from '../../src/panes/EchoAvatar/EchoAvatarPanel';

const meta: Meta<typeof EchoAvatarPanel> = {
  title: 'Echo/Avatar/EchoAvatarPanel',
  component: EchoAvatarPanel,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof EchoAvatarPanel>;

export const Default: Story = {
  args: { enableVoice: false }, // disable in Storybook by default to avoid permission prompts
};
