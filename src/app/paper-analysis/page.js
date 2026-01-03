'use client';

import { AnalysisProvider } from './automatic-creation/contexts/AnalysisContext';
import PaperAnalysis from './automatic-creation/dashboard/PaperAnalysis';

export default function Page() {
  return (
    <AnalysisProvider>
      <PaperAnalysis />
    </AnalysisProvider>
  );
}