// ReportContext.jsx
// React context for report data.

import React, { createContext, useContext } from 'react';
export const ReportContext = createContext(null);
export const useReportContext = () => useContext(ReportContext);
