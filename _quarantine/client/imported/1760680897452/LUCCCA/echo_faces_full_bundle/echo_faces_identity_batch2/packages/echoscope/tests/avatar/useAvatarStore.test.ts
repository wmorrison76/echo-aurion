
import { act } from '@testing-library/react';
import { useAvatarStore } from '../../src/hooks/useAvatarStore';

describe('useAvatarStore', () => {
  it('sets persona and talking state', () => {
    const { setSelected, setIsTalking } = useAvatarStore.getState();
    act(() => {
      setSelected('man');
      setIsTalking(true);
    });
    const state = useAvatarStore.getState();
    expect(state.selected).toBe('man');
    expect(state.isTalking).toBe(true);
  });
});
