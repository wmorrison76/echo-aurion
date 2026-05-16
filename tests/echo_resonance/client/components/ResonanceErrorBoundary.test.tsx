/**
 * ===========================================================================
 * ResonanceErrorBoundary tests
 * ===========================================================================
 * Layer:    Resonance (UI)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Verify the boundary catches descendant errors, renders the
 *           default fallback (or a custom one), invokes onError, and
 *           resets back to children on the user's Retry click.
 * ===========================================================================
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { ResonanceErrorBoundary } from '../../../../client/components/resonance/ResonanceErrorBoundary';

function Boom({ throwIt }: { throwIt: boolean }): React.ReactElement {
  if (throwIt) throw new Error('child component blew up');
  return <div>healthy child</div>;
}

describe('ResonanceErrorBoundary', () => {
  // Suppress React's noisy console.error for expected throws inside tests
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockClear();
  });

  it('renders children when no error', () => {
    render(
      <ResonanceErrorBoundary>
        <Boom throwIt={false} />
      </ResonanceErrorBoundary>,
    );
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('catches a thrown error and renders the default fallback', () => {
    render(
      <ResonanceErrorBoundary label="trajectory dashboard">
        <Boom throwIt={true} />
      </ResonanceErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Couldn't render trajectory dashboard/)).toBeInTheDocument();
    expect(screen.getByText(/child component blew up/)).toBeInTheDocument();
  });

  it('invokes onError with the error and component info', () => {
    const onError = vi.fn();
    render(
      <ResonanceErrorBoundary onError={onError}>
        <Boom throwIt={true} />
      </ResonanceErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const [err, info] = onError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('child component blew up');
    expect(info.componentStack).toBeTruthy();
  });

  it('Retry click resets the boundary', () => {
    function ToggleHarness(): React.ReactElement {
      const [throwIt, setThrowIt] = React.useState(true);
      // expose setter so test can flip "throwIt" before retry
      React.useEffect(() => {
        (window as any).__setThrow = setThrowIt;
        return () => {
          delete (window as any).__setThrow;
        };
      }, []);
      return (
        <ResonanceErrorBoundary>
          <Boom throwIt={throwIt} />
        </ResonanceErrorBoundary>
      );
    }
    render(<ToggleHarness />);
    expect(screen.getByText(/child component blew up/)).toBeInTheDocument();

    // Flip the switch so the retry rerender doesn't immediately throw again
    (window as any).__setThrow(false);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('honors custom fallback render prop', () => {
    render(
      <ResonanceErrorBoundary
        fallback={({ error }) => <div>custom: {error.message}</div>}
      >
        <Boom throwIt={true} />
      </ResonanceErrorBoundary>,
    );
    expect(screen.getByText(/custom: child component blew up/)).toBeInTheDocument();
  });
});
