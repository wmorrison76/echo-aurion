// useReportGenerator.js
// Hook to access ReportGenerator.

import { useContext } from 'react';
import { ReportContext } from './ReportContext';
export default function useReportGenerator() {
  return useContext(ReportContext);
}
