
import { describe, it, expect } from 'vitest';
import { collide, resolve } from '../collision';

describe('collision', () => {
  it('detects overlap', () => {
    expect(collide({ x:0,y:0,w:10,h:10 }, { x:5,y:5,w:10,h:10 })).toBe(true);
  });
  it('resolves with push-out', () => {
    const r = resolve({ x:5,y:5,w:10,h:10 }, { x:0,y:0,w:10,h:10 });
    expect(r.x).toBeLessThan(0);
  });
});
