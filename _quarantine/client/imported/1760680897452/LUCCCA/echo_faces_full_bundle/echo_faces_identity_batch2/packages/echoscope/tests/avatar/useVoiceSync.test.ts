
/**
 * We mock the Web Audio APIs because JSDOM doesn't implement them.
 */
import { renderHook } from '@testing-library/react';
import { useVoiceSync } from '../../src/hooks/useVoiceSync';

describe('useVoiceSync', () => {
  beforeAll(() => {
    (navigator as any).mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => ({})
      })
    };
    (window as any).AudioContext = class {
      createAnalyser() { return { fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData: jest.fn() }; }
      createMediaStreamSource() { return { connect: jest.fn() }; }
      close() { return Promise.resolve(); }
    };
    (window as any).webkitAudioContext = undefined;
  });

  it('should initialize without throwing', async () => {
    const { result } = renderHook(() => useVoiceSync(false)); // disabled for test
    expect(result).toBeTruthy();
  });
});
