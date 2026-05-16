import { describe, it, expect } from 'vitest';
import { AutoLayoutEngine } from '../AutoLayoutEngine';

describe('AutoLayoutEngine', () => {
  it('should tile panes into grid positions', () => {
    const panes = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const layout = AutoLayoutEngine.tile(panes, 300, 300);
    expect(layout.length).toBe(3);
  });
});