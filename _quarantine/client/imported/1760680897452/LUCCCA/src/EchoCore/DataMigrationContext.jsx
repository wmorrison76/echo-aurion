// DataMigrationContext.jsx
// Context for data migration state.

import React, { createContext, useContext } from 'react';
export const DataMigrationContext = createContext(null);
export const useDataMigration = () => useContext(DataMigrationContext);
