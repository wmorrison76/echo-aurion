/**
 * ===========================================================================
 * TrajectoryDashboard component tests
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Render-and-interact tests for the GM floor view.
 *           Mocks useFloorView to drive states: loading / error / empty / data.
 *           Verifies filter behavior and sort order (red first, then by lift gap).
 * ===========================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import type { TrajectoryTile } from '../../../../shared/types/resonance';

// Mock the hook
const mockUseFloorView = vi.fn();
vi.mock('../../../../client/lib/resonance/use-resonance', () => ({
  useFloorView: (...args: unknown[]) => mockUseFloorView(...args),
}));

import { TrajectoryDashboard } from '../../../../client/components/resonance/TrajectoryDashboard';

function tile(overrides: Partial<TrajectoryTile> = {}): TrajectoryTile {
  return {
    guestId: '00000000-0000-0000-0000-000000000001',
    guestName: 'Smith party',
    tableOrRoom: 'Table 14',
    partySize: 2,
    visitId: '00000000-0000-0000-0000-000000000a01',
    status: 'green',
    sparkline: [5, 6, 7],
    liftGap: 0,
    hasOpenIntervention: false,
    ...overrides,
  };
}

const PROPERTY_ID = '99999999-8888-7777-6666-555555555555';

describe('TrajectoryDashboard', () => {
  beforeEach(() => {
    mockUseFloorView.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders skeleton placeholders while loading', () => {
    mockUseFloorView.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(<TrajectoryDashboard propertyId={PROPERTY_ID} />);
    // Skeletons are anonymous divs; assert at least 4 animate-pulse elements
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders error block with retry button on isError', () => {
    const refetch = vi.fn();
    mockUseFloorView.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('upstream 500'),
      refetch,
    });
    render(<TrajectoryDashboard propertyId={PROPERTY_ID} />);
    expect(screen.getByText(/Could not load floor view/i)).toBeInTheDocument();
    expect(screen.getByText(/upstream 500/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when no active visits', () => {
    mockUseFloorView.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<TrajectoryDashboard propertyId={PROPERTY_ID} />);
    expect(screen.getByText(/No active visits at this property yet/i)).toBeInTheDocument();
  });

  it('renders one tile per trajectory with correct status label', () => {
    mockUseFloorView.mockReturnValue({
      data: [
        tile({ visitId: 'v1', guestName: 'Alice', status: 'green' }),
        tile({ visitId: 'v2', guestName: 'Bob', status: 'amber', liftGap: 0.5 }),
        tile({ visitId: 'v3', guestName: 'Carol', status: 'red', liftGap: 2.5 }),
      ],
      isLoading: false,
      isError: false,
    });
    render(<TrajectoryDashboard propertyId={PROPERTY_ID} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getAllByText(/on track/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/at risk/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/needs care/i).length).toBeGreaterThanOrEqual(1);
  });

  it('sorts red first, then amber, then green; within band by lift gap DESC', () => {
    mockUseFloorView.mockReturnValue({
      data: [
        tile({ visitId: 'v1', guestName: 'Green-a', status: 'green', liftGap: 0 }),
        tile({ visitId: 'v2', guestName: 'Red-low', status: 'red', liftGap: 1.5 }),
        tile({ visitId: 'v3', guestName: 'Amber-a', status: 'amber', liftGap: 0.5 }),
        tile({ visitId: 'v4', guestName: 'Red-high', status: 'red', liftGap: 4.0 }),
      ],
      isLoading: false,
      isError: false,
    });
    const { container } = render(<TrajectoryDashboard propertyId={PROPERTY_ID} />);
    const tileButtons = container.querySelectorAll('button[aria-label]');
    // Filter to tile-shaped aria-labels (start with a guest name we set)
    const guestNames = Array.from(tileButtons)
      .map((b) => b.getAttribute('aria-label') ?? '')
      .filter((l) => /^(Green|Red|Amber)-/.test(l))
      .map((l) => l.split(',')[0]);
    // Red rows first (sorted by liftGap DESC: Red-high then Red-low),
    // then Amber, then Green
    expect(guestNames).toEqual(['Red-high', 'Red-low', 'Amber-a', 'Green-a']);
  });

  it('filter pills hide non-matching tiles', () => {
    mockUseFloorView.mockReturnValue({
      data: [
        tile({ visitId: 'v1', guestName: 'Alice', status: 'green' }),
        tile({ visitId: 'v2', guestName: 'Bob', status: 'red', liftGap: 2 }),
      ],
      isLoading: false,
      isError: false,
    });
    render(<TrajectoryDashboard propertyId={PROPERTY_ID} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // The filter pill has exact accessible name 'Needs care'; tile aria-labels
    // include guest + status + party so they don't exact-match.
    fireEvent.click(screen.getByRole('button', { name: 'Needs care' }));
    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('tap on a tile invokes onSelectTile with the tile object', () => {
    const onSelectTile = vi.fn();
    const t = tile({ visitId: 'v1', guestName: 'Alice', status: 'green' });
    mockUseFloorView.mockReturnValue({ data: [t], isLoading: false, isError: false });
    render(
      <TrajectoryDashboard propertyId={PROPERTY_ID} onSelectTile={onSelectTile} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Alice/i }));
    expect(onSelectTile).toHaveBeenCalledWith(t);
  });
});
