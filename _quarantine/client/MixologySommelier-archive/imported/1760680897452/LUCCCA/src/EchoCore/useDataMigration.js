// useDataMigration.js
// Hook for using DataMigrationEngine.

import { useContext } from 'react';
import { DataMigrationContext } from './DataMigrationContext';
export default function useDataMigration() {
  return useContext(DataMigrationContext);
}
