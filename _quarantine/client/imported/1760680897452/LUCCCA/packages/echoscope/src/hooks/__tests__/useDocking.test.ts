
import { renderHook, act } from '@testing-library/react';
import { useDocking } from '../useDocking';

describe('useDocking', () => {
  it('activates zone on drag over', () => {
    const { result } = renderHook(() => useDocking());
    act(() => {
      result.current.onDragOver({ preventDefault() {}, dataTransfer: {} } as any, 'left');
    });
    expect(result.current.activeZone).toBe('left');
  });
});
