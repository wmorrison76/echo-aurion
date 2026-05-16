/**
 * ===========================================================================
 * WhisperWidget component tests
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Render-and-interact tests for the staff capture widget.
 *           Mocks the useSubmitReading hook to avoid network. Verifies:
 *             - inline mode renders open
 *             - floating mode renders trigger button → click → opens panel
 *             - submit disabled until both quadrant + score selected
 *             - quadrant + score + note round-trip into the mutation
 *             - confirmation message appears after success
 * ===========================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Mock the hook the component uses. The component touches no other side effects.
const mockMutateAsync = vi.fn();
vi.mock('../../../../client/lib/resonance/use-resonance', () => ({
  useSubmitReading: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

import { WhisperWidget } from '../../../../client/components/resonance/WhisperWidget';

const baseProps = {
  activeGuestId: '11111111-2222-3333-4444-555555555555',
  activeVisitId: '22222222-3333-4444-5555-666666666666',
  staffId: '33333333-4444-5555-6666-777777777777',
};

describe('WhisperWidget', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('inline mode renders the open panel directly', () => {
    render(<WhisperWidget {...baseProps} position="inline" />);
    expect(screen.getByRole('dialog', { name: /whisper widget/i })).toBeInTheDocument();
    expect(screen.getByText(/how are they/i)).toBeInTheDocument();
  });

  it('floating mode starts as a trigger button and expands on click', () => {
    render(<WhisperWidget {...baseProps} position="bottom-right" />);
    const trigger = screen.getByRole('button', { name: /open whisper widget/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: /whisper widget/i })).toBeInTheDocument();
  });

  it('submit button is disabled until quadrant AND score are picked', () => {
    render(<WhisperWidget {...baseProps} position="inline" />);
    const submit = screen.getByRole('button', { name: /^whisper$/i });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /lit up/i }));
    expect(submit).toBeDisabled(); // still — no score yet

    fireEvent.click(screen.getByRole('button', { name: /score 7/i }));
    expect(submit).not.toBeDisabled();
  });

  it('round-trips quadrant + score + note into the mutation payload', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'reading-1', resonance: 8 });
    const onSubmitted = vi.fn();
    render(
      <WhisperWidget {...baseProps} position="inline" onSubmitted={onSubmitted} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /tense/i })); // high-neg
    fireEvent.click(screen.getByRole('button', { name: /score 4/i }));
    const note = screen.getByLabelText(/whisper note/i);
    fireEvent.change(note, { target: { value: 'wife seems tense, ordered cocktail fast' } });

    fireEvent.click(screen.getByRole('button', { name: /^whisper$/i }));

    // Wait one microtask for mutateAsync to be observed
    await Promise.resolve();
    await Promise.resolve();

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    const payload = mockMutateAsync.mock.calls[0][0];
    expect(payload.guestId).toBe(baseProps.activeGuestId);
    expect(payload.visitId).toBe(baseProps.activeVisitId);
    expect(payload.capturedBy).toBe(baseProps.staffId);
    expect(payload.resonance).toBe(4);
    expect(payload.arousal).toBeGreaterThan(0); // high
    expect(payload.valence).toBeLessThan(0); // negative
    expect(payload.note).toBe('wife seems tense, ordered cocktail fast');
    expect(payload.signals).toEqual([]);
  });

  it('shows confirmation after a successful submit', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'reading-1', resonance: 9 });
    render(<WhisperWidget {...baseProps} position="inline" />);

    fireEvent.click(screen.getByRole('button', { name: /lit up/i }));
    fireEvent.click(screen.getByRole('button', { name: /score 9/i }));
    fireEvent.click(screen.getByRole('button', { name: /^whisper$/i }));

    // mutation resolves; confirmation text appears
    await screen.findByText(/recorded\./i);
  });

  it('shows error message when submit rejects', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network down'));
    render(<WhisperWidget {...baseProps} position="inline" />);

    fireEvent.click(screen.getByRole('button', { name: /settled/i }));
    fireEvent.click(screen.getByRole('button', { name: /score 6/i }));
    fireEvent.click(screen.getByRole('button', { name: /^whisper$/i }));

    await screen.findByText(/Network down/);
  });

  it('voice channel maps when channel prop = voice (no quadrant defaults change)', () => {
    render(
      <WhisperWidget
        {...baseProps}
        position="inline"
        channel="voice"
      />,
    );
    // Just verifies the component accepts the prop without crashing.
    // Channel→source mapping is exercised by resonance-engine tests.
    expect(screen.getByRole('dialog', { name: /whisper widget/i })).toBeInTheDocument();
  });
});
