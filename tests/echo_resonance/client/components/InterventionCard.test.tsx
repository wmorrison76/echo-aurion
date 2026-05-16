/**
 * ===========================================================================
 * InterventionCard component tests
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Verify the intervention card renders all the operator-facing
 *           context the master doc §4.4 requires: name, description,
 *           approach, effort, lead time, cost (or "no marginal cost"),
 *           success rate (or "no track record yet"), departments,
 *           direction (NOT dialogue), do-nots, status chip when present.
 *
 *           Plus the action surface: approve, skip-with-reason flow.
 * ===========================================================================
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type {
  InterventionExecution,
  InterventionTemplate,
} from '../../../../shared/types/resonance';
import { InterventionCard } from '../../../../client/components/resonance/InterventionCard';

function template(over: Partial<InterventionTemplate> = {}): InterventionTemplate {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    name: 'Calm visit, small comp',
    description: 'Server visits with calm voice; offers a small comp framed as gift not apology.',
    affectQuadrants: ['high-neg'],
    approach: 'gentle-approach',
    effort: 'light',
    leadTimeMinutes: 5,
    estimatedCostCents: 2500,
    estimatedCostCurrency: 'USD',
    reuseCooldownDays: 7,
    departmentsRequired: ['front-of-house', 'kitchen'],
    proxemicGuidance: 'approach from the side; do not crowd',
    scriptedDirection: "acknowledge the wait briefly without making it the topic",
    doNots: ['do not apologize at length', 'do not crowd the table'],
    timesUsed: 12,
    successRate: 0.83,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...over,
  };
}

function execution(over: Partial<InterventionExecution> = {}): InterventionExecution {
  return {
    id: 'aa111111-2222-3333-4444-555555555555',
    templateId: '11111111-2222-3333-4444-555555555555',
    guestId: 'bb111111-2222-3333-4444-555555555555',
    visitId: 'cc111111-2222-3333-4444-555555555555',
    proposedAt: '2026-05-06T12:00:00.000Z',
    proposedBy: 'echo-fast',
    status: 'proposed',
    cascadeId: null,
    createdAt: '2026-05-06T12:00:00.000Z',
    updatedAt: '2026-05-06T12:00:00.000Z',
    ...over,
  };
}

describe('InterventionCard', () => {
  it('renders core operator-facing fields', () => {
    cleanup();
    render(
      <InterventionCard
        template={template()}
        onApprove={() => {}}
        onSkip={() => {}}
      />,
    );
    expect(screen.getByText('Calm visit, small comp')).toBeInTheDocument();
    expect(screen.getByText(/Server visits with calm voice/)).toBeInTheDocument();
    expect(screen.getByText(/Gentle approach/)).toBeInTheDocument();
    expect(screen.getByText(/Light/)).toBeInTheDocument();
    expect(screen.getByText(/5 min lead time/)).toBeInTheDocument();
    // Cost (en-US fallback may vary per locale; assert "$25" is present)
    expect(screen.getByText(/\$25/)).toBeInTheDocument();
    expect(screen.getByText(/83% success across 12 runs/)).toBeInTheDocument();
    expect(screen.getByText('front-of-house')).toBeInTheDocument();
    expect(screen.getByText('kitchen')).toBeInTheDocument();
    expect(screen.getByText(/acknowledge the wait briefly/)).toBeInTheDocument();
    expect(screen.getByText(/approach from the side/)).toBeInTheDocument();
    expect(screen.getByText(/do not apologize at length/)).toBeInTheDocument();
    expect(screen.getByText(/do not crowd the table/)).toBeInTheDocument();
  });

  it('handles "no track record yet" when timesUsed is 0', () => {
    cleanup();
    render(
      <InterventionCard
        template={template({ timesUsed: 0, successRate: 0 })}
        onApprove={() => {}}
        onSkip={() => {}}
      />,
    );
    expect(screen.getByText(/no track record yet/i)).toBeInTheDocument();
  });

  it('handles "no marginal cost" when cents = 0', () => {
    cleanup();
    render(
      <InterventionCard
        template={template({ estimatedCostCents: 0 })}
        onApprove={() => {}}
        onSkip={() => {}}
      />,
    );
    expect(screen.getByText(/no marginal cost/i)).toBeInTheDocument();
  });

  it('clicking Approve calls onApprove', () => {
    cleanup();
    const onApprove = vi.fn();
    render(
      <InterventionCard
        template={template()}
        onApprove={onApprove}
        onSkip={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /propose & approve/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('skip flow: opens reason textarea, captures input, calls onSkip with reason', () => {
    cleanup();
    const onSkip = vi.fn();
    render(
      <InterventionCard
        template={template()}
        onApprove={() => {}}
        onSkip={onSkip}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));
    const textarea = screen.getByLabelText(/skip reason/i);
    fireEvent.change(textarea, { target: { value: 'guest already content' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm skip/i }));
    expect(onSkip).toHaveBeenCalledWith('guest already content');
  });

  it('skip with no reason calls onSkip with empty string', () => {
    cleanup();
    const onSkip = vi.fn();
    render(
      <InterventionCard
        template={template()}
        onApprove={() => {}}
        onSkip={onSkip}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm skip/i }));
    expect(onSkip).toHaveBeenCalledWith('');
  });

  it('hides actions when execution is in terminal state', () => {
    cleanup();
    render(
      <InterventionCard
        template={template()}
        execution={execution({ status: 'completed' })}
        onApprove={() => {}}
        onSkip={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^skip$/i })).toBeNull();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('busy=true disables the action buttons', () => {
    cleanup();
    render(
      <InterventionCard
        template={template()}
        onApprove={() => {}}
        onSkip={() => {}}
        busy
      />,
    );
    expect(screen.getByRole('button', { name: /propose & approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^skip$/i })).toBeDisabled();
  });
});
