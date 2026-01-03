import React, { useEffect } from 'react';
import { Progress } from 'reactstrap';
import { Clock } from 'lucide-react';
import { useAnalysis } from '../automatic-creation/contexts/AnalysisContext';

const AutoTransition = () => {
  const { state, dispatch } = useAnalysis();
  const { currentStepId, steps, analysisMode, navigation } = state;

  // Get current step info
  const currentStep = steps.find(step => step.id === currentStepId);
  const nextStep = currentStep?.nextStep 
    ? steps.find(step => step.id === currentStep.nextStep)
    : null;

  // Check if current step is completed based on its type
  const isStepCompleted = () => {
    switch (currentStep?.id) {
      case 'metadata':
        return state.metadata.status === 'success';
      case 'researchFields':
        return state.researchFields.status === 'success';
      case 'research-problem':
        return state.researchProblems.processing_info.status === 'success';
      case 'template':
        return state.templates.status === 'success';
      default:
        return state.completedSteps[currentStep?.id];
    }
  };

  useEffect(() => {
    if (
      analysisMode !== 'automatic' || 
      !currentStep?.transitionDelay || 
      !nextStep || 
      !isStepCompleted() ||
      navigation.isTransitioning
    ) {
      return;
    }

    console.log('Starting transition with delay:', currentStep.transitionDelay);

    dispatch({ 
      type: 'START_TRANSITION',
      payload: {
        fromStep: currentStep.id,
        toStep: nextStep.id,
        delay: currentStep.transitionDelay
      }
    });
  }, [currentStep, nextStep, analysisMode, dispatch, isStepCompleted, navigation.isTransitioning]);

  if (!navigation.isTransitioning || !nextStep) {
    return null;
  }

  const remainingSeconds = Math.ceil(navigation.remainingTime / 1000);
  
  return (
    <div className="mt-4 border rounded p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm text-gray-600">
            Proceeding to {nextStep.label} in {remainingSeconds}s
          </span>
        </div>
        <span className="text-sm font-medium">
          {Math.round(navigation.progress)}%
        </span>
      </div>
      
      <Progress value={navigation.progress} className="h-2" />
    </div>
  );
};

export default AutoTransition;