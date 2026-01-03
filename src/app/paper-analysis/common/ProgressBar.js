'use client';
import { useGlobal } from '../automatic-creation/contexts/GlobalContext_old';

export default function ProgressBar() {
  const { state } = useGlobal();
  const stepIndex = state.steps.findIndex(s => s.id === state.currentStep);
  const progress = ((stepIndex + 1) / state.steps.length) * 100;
  
  return (
    <div className="progress mt-4">
      <div 
        className="progress-bar" 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}