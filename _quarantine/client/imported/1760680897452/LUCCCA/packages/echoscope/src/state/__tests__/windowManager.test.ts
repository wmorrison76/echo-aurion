
import { describe, it, expect } from 'vitest';
import { windowManager } from '../../state/windowManager';

describe('windowManager', () => {
  it('creates and moves panes deterministically', () => {
    windowManager.createPane({ id: 'p1', x: 0, y: 0, w: 100, h: 100, z: 1 });
    const s1 = windowManager.getState();
    expect(s1.panes.length).toBe(1);
    windowManager.movePane('p1', 10, 10);
    const s2 = windowManager.getState();
    expect(s2.panes[0].x).toBe(10);
  });
});
