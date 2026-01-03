import React from 'react';
import { Button } from 'reactstrap';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useStepNavigation, useAnalysis } from '../automatic-creation/contexts/AnalysisContext';

const StepNavigation = () => {
  const { state } = useAnalysis();
  const { analysisMode } = state;
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    canNavigateNext,
    navigate
  } = useStepNavigation();

  // Don't show navigation in automatic mode
  if (analysisMode === 'automatic' || !currentStep) {
    return null;
  }

  return (
    <div className="d-flex justify-content-between align-items-center mt-4">
      {!isFirstStep && (
        <Button
          color="secondary"
          outline
          onClick={() => navigate('prev')}
          className="d-flex align-items-center gap-2"
        >
          <ArrowLeft size={16} />
          Previous
        </Button>
      )}
      
      {isFirstStep && <div />}

      {!isLastStep && (
        <Button
          color="danger"
          onClick={() => navigate('next')}
          disabled={!canNavigateNext()}
          className="d-flex align-items-center gap-2"
        >
          Next
          <ArrowRight size={16} />
        </Button>
      )}

      {isLastStep && <div />}
    </div>
  );
};

export default StepNavigation;