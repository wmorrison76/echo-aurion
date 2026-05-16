import React from 'react';
import { AuthProvider } from './AuthContext';
import { ScheduleProvider } from './ScheduleContext';
import { RecipeProvider } from './RecipeContext';

/**
 * Combines all context providers
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RecipeProvider>
        <ScheduleProvider>
          {children}
        </ScheduleProvider>
      </RecipeProvider>
    </AuthProvider>
  );
}

