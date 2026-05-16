import React, { Suspense } from 'react'
import { LegacyDesignStudio } from '../legacy/LegacyDesignStudio'
import { ErrorBoundary } from '../legacy/ErrorBoundary'

/**
 * LegacyHost — mounts the legacy/large studio code in a safe shell.
 * - ErrorBoundary prevents the whole app from crashing.
 * - Suspense lets us lazy-load later if needed.
 */
export default function LegacyHost() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="p-4 text-xs opacity-70">Loading legacy studio…</div>}>
        <LegacyDesignStudio />
      </Suspense>
    </ErrorBoundary>
  )
}
