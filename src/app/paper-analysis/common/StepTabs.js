import React from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAnalysis } from '../automatic-creation/contexts/AnalysisContext';

const StepTabs = () => {
  const { state, dispatch } = useAnalysis();
  console.log(state);
  const { steps, currentStepId, completedSteps } = state;
  console.log('state',state);
  const resetStepsBetween = (targetStepId) => {
    const currentIndex = steps.findIndex(step => step.id === currentStepId);
    const targetIndex = steps.findIndex(step => step.id === targetStepId);
    
    // Only proceed if we're going backwards
    if (targetIndex < currentIndex) {
      // Reset all steps from target onwards
      for (let i = targetIndex; i <= currentIndex; i++) {
        dispatch({ type: 'RESET_STEP', payload: steps[i].id });
      }
  
      // Clear data based on which step we're going back to
      dispatch({ 
        type: 'CLEAR_DATA_FROM_STEP', 
        payload: {
          stepIndex: targetIndex,
          currentStepIndex: currentIndex
        }
      });
    }
  };

  const handleTabClick = (stepId) => {
    if (completedSteps[stepId] || currentStepId === stepId) {
      const targetIndex = steps.findIndex(step => step.id === stepId);
      const currentIndex = steps.findIndex(step => step.id === currentStepId);

      // If clicking on a previous step
      if (targetIndex < currentIndex) {
        resetStepsBetween(stepId);
      }

      dispatch({ type: 'SET_CURRENT_STEP', payload: stepId });
    }
  };

  return (
    <div className="mb-4">
      <Nav className="position-relative border-bottom">
        {steps.map((step, index) => {
          const isCompleted = completedSteps[step.id];
          console.log(isCompleted,step.id);
          const isCurrent = currentStepId === step.id;
          const isClickable = isCompleted || isCurrent;
          
          return (
            <NavItem key={step.id} className="position-relative">
              <NavLink
                onClick={() => handleTabClick(step.id)}
                className={`
                  d-flex align-items-center py-3 px-4 border-0
                  ${isClickable ? 'cursor-pointer' : 'disabled opacity-50'}
                  ${isCurrent ? 'active text-danger border-bottom border-2 border-danger' : ''}
                  ${isCompleted ? 'text-success' : 'text-secondary'}
                `}
              >
                <div className="d-flex align-items-center">
                  <div className={`
                    d-flex align-items-center justify-content-center rounded-circle me-2
                    ${isCompleted ? 'bg-success text-white' : ''}
                    ${isCurrent ? 'bg-danger text-white' : ''}
                    ${!isCompleted && !isCurrent ? 'border border-2 border-secondary' : ''}
                  `}
                  style={{ width: '24px', height: '24px' }}>
                    {isCompleted ? (
                      <CheckCircle size={14} />
                    ) : (
                      <span className="small">{index + 1}</span>
                    )}
                  </div>

                  <span className={`
                    ${isCurrent ? 'fw-medium' : 'fw-normal'}
                    small
                  `}>
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div className="position-absolute top-50 translate-middle-y" 
                       style={{ right: '-15px', zIndex: 1 }}>
                    <ArrowRight 
                      size={20}
                      className={isCompleted ? 'text-success' : 'text-secondary'}
                    />
                  </div>
                )}
              </NavLink>
            </NavItem>
          );
        })}
      </Nav>
    </div>
  );
};

export default StepTabs;