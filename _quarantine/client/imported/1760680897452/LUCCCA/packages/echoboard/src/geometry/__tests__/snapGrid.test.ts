
import { describe, it, expect } from 'vitest';
import { snap } from '../snapGrid';

describe('snap', () => {
  it('snaps to nearest step', () => {
    expect(snap(7, 8)).toBe(8);
  });
});
