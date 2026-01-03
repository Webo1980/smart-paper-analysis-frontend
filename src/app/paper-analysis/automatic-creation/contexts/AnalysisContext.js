'use client';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { generateToken, saveEvaluationData } from '../../services/githubService'

const REQUIRED_STEPS = ['metadata', 'researchFields', 'researchProblems', 'template', 'paperContent'];

// Define steps configuration
const STEPS = [
  { 
    id: 'metadata', 
    label: 'Metadata Analysis',
    transitionDelay: 5000,
    nextStep: 'researchFields',
    prevStep: null,
  },
  { 
    id: 'researchFields', 
    label: 'Research Field Identification',
    transitionDelay: 10000,
    nextStep: 'researchProblems',
    prevStep: 'metadata',
  },
  { 
    id: 'researchProblems',
    label: 'Research Problem Discovery',
    transitionDelay: 15000,
    nextStep: 'template',
    prevStep: 'researchFields',
  },
  { 
    id: 'template', 
    label: 'Template Detection',
    transitionDelay: 12000,
    nextStep: 'paperContent',
    prevStep: 'researchProblems',
  },
  { 
    id: 'paperContent', 
    label: 'Content Analysis',
    transitionDelay: 8000,
    nextStep: 'FinalStep',
    prevStep: 'template',
  }
  ,
  { 
    id: 'FinalStep', 
    label: 'Analysis Closure',
    transitionDelay: 8000,
    nextStep: null,
    prevStep: 'template',
  }
];

const initialState = {
  // Global UI State
  analysisMode: 'user_guided',
  currentStepId: 'metadata',
  steps: STEPS,
  error: null,
  loading: false,
  progress: 0,
  
  // Navigation State
  navigation: {
    isNavigating: false,
    direction: null,
    targetStep: null,
    progress: 0,

    isTransitioning: false,
    fromStep: null,
    toStep: null,
    startTime: null,
    remainingTime: 0
  },
  
  // Analysis Data
  metadata: {
    title: null,
    authors: [],
    abstract: null,
    doi: null,
    url: null,
    publicationDate: null,
    status: 'idle'
  },
  
  researchFields: {
    fields: [],
    selectedField: null,
    status: 'idle'
  },
  
  researchProblems: {
    orkg_problems: [],
    llm_problem: null,
    metadata: {
      total_scanned: 0,
      total_identified: 0,
      total_similar: 0,
      total_valid: 0,
      field_id: '',
      similarities_found: 0,
      threshold_used: 0.5,
      max_similarity: 0
    },
    processing_info: {
      step: '',
      status: 'idle',
      progress: 0,
      message: '',
      timestamp: null
    },
    selectedProblem: null
  },
  
  templates: {
    available: [],
    selectedTemplate: null,
    llm_template: null,
    status: 'idle',
    processing_info: {
      step: '',
      status: 'idle',
      progress: 0,
      message: '',
      timestamp: null
    }
  },
  
  paperContent: {
    paperContent: null,
    status: 'idle'
  },
  
  // Step completion tracking
  completedSteps: {
    metadata: false,
    researchFields: false,
    researchProblems: false,
    template: false,
    paperContent: false
  },

  evaluationData: {
    token: generateToken(),
    metadata: null,
    researchFields: null,
    researchProblems: null,
    template: null,
    paperContent: null,
    completedSteps: {},
    timestamp: null
  }
};

const isEvaluationComplete = (evaluationData) => {
  return REQUIRED_STEPS.every(step => evaluationData.completedSteps[step]);
};

// Helper function for research problems data transformation
const transformResearchProblemsData = (rawData) => {
  // If we receive the old format (with 'problems' instead of 'orkg_problems')
  const orkg_problems = rawData.orkg_problems || rawData.problems || [];
  
  return {
    orkg_problems,
    llm_problem: rawData.llm_problem || null,
    metadata: {
      total_scanned: rawData.metadata?.total_scanned || 0,
      total_identified: rawData.metadata?.total_identified || 0,
      total_similar: rawData.metadata?.total_similar || 0,
      total_valid: rawData.metadata?.total_valid || 0,
      field_id: rawData.metadata?.field_id || '',
      similarities_found: rawData.metadata?.similarities_found || 0,
      threshold_used: rawData.metadata?.threshold_used || 0.5,
      max_similarity: rawData.metadata?.max_similarity || 0
    },
    processing_info: {
      step: rawData.processing_info?.step || '',
      status: rawData.processing_info?.status || 'completed',
      progress: rawData.processing_info?.progress || 100,
      message: rawData.processing_info?.message || '',
      timestamp: rawData.processing_info?.timestamp || new Date().toISOString()
    }
  };
};

function analysisReducer(state, action) {
  console.log(action.type,state);
  switch (action.type) {
    case 'START_TRANSITION':
      return {
        ...state,
        navigation: {
          isTransitioning: true,
          fromStep: action.payload.fromStep,
          toStep: action.payload.toStep,
          startTime: Date.now(),
          progress: 0,
          remainingTime: action.payload.delay,
          shouldBlock: true
        }
      };
    
      case 'UPDATE_TRANSITION':
        const elapsed = Date.now() - state.navigation.startTime;
        const totalDelay = state.steps.find(s => s.id === state.navigation.fromStep)?.transitionDelay || 0;
        const newProgress = Math.min(100, (elapsed / totalDelay) * 100);
        const newRemainingTime = Math.max(0, totalDelay - elapsed);
        
        // If transition is complete
        if (newRemainingTime <= 0) {
          return {
            ...state,
            currentStepId: state.navigation.toStep,
            completedSteps: {
              ...state.completedSteps,
              [state.navigation.fromStep]: true
            },
            navigation: {
              isTransitioning: false,
              fromStep: null,
              toStep: null,
              startTime: null,
              progress: 0,
              remainingTime: 0,
              shouldBlock: false
            }
          };
        }
        
        return {
          ...state,
          navigation: {
            ...state.navigation,
            progress: newProgress,
            remainingTime: newRemainingTime
          }
        };

   case 'END_TRANSITION':
    return {
      ...state,
      navigation: {
        ...initialState.navigation
      }
    };
    case 'BLOCK_NAVIGATION':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          isNavigating: false
        }
      };
    case 'SET_ANALYSIS_MODE':
      return {
        ...state,
        analysisMode: action.payload
      };
      
    case 'SET_CURRENT_STEP':
      // const stepIndex = state.steps.findIndex(step => step.id === action.payload);
      // Block step changes if we're in a transition
      if (state.navigation.isTransitioning) {
        return state;
      }
      return {
        ...state,
        currentStepId: action.payload,
        progress: ((state.steps.findIndex(step => step.id === action.payload)) / (state.steps.length)) * 100
      };
    
    case 'RESET_STEP':
      return {
        ...state,
        completedSteps: {
        ...state.completedSteps,
        [action.payload]: false
      }
    };
      
    case 'START_NAVIGATION':
      return {
        ...state,
        navigation: {
          isNavigating: true,
          direction: action.payload.direction,
          targetStep: action.payload.targetStep,
          progress: 0
        }
      };
      
    case 'UPDATE_NAVIGATION_PROGRESS':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          progress: action.payload
        }
      };
      
    case 'END_NAVIGATION':
      return {
        ...state,
        navigation: initialState.navigation
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
      
    case 'SET_METADATA':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          ...action.payload,
          status: 'success'
        }
      };

    case 'SET_METADATA_STATUS':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          status: action.payload
        }
      };
      
    case 'COMPLETE_STEP':
      return {
        ...state,
        completedSteps: {
          ...state.completedSteps,
          [action.payload]: true
        }
      };

    case 'SET_RESEARCH_FIELDS':
      return {
        ...state,
        researchFields: {
          ...state.researchFields,
          fields: action.payload,
          status: 'success'
        }
      };

    case 'SELECT_RESEARCH_FIELD':
      return {
        ...state,
        researchFields: {
          ...state.researchFields,
          selectedField: action.payload
        }
      };
    case 'SET_RESEARCH_FIELDS_STATUS': {
        const processing_info = action.payload.processing_info || {
          step: action.payload.step || 'identification',
          status: action.payload,
          progress: action.payload.progress || 100,
          message: action.payload.message || '',
          timestamp: action.payload.timestamp || new Date().toISOString()
        };
      
        return {
          ...state,
          researchFields: {
            ...state.researchFields,
            status: action.payload.status || action.payload,
            processing_info: {
              ...state.researchFields.processing_info,
              ...processing_info
            }
          }
        };
     }

   case 'SELECT_RESEARCH_PROBLEM':
        return {
          ...state,
          researchProblems: {
            ...state.researchProblems,
            selectedProblem: action.payload
          }
        };

    case 'SET_RESEARCH_PROBLEMS': {
      const transformedData = transformResearchProblemsData(action.payload);
      return {
            ...state,
            researchProblems: {
              ...state.researchProblems,
              ...transformedData,
              selectedProblem: state.researchProblems.selectedProblem // Preserve selected problem
            }
      };
    }
      
    case 'SET_RESEARCH_PROBLEMS_STATUS':
      return {
        ...state,
        researchProblems: {
          ...state.researchProblems,
          processing_info: {
            ...state.researchProblems.processing_info,
            status: action.payload
          }
        },
        completedSteps: {
          ...state.completedSteps,
          researchProblems: true
        }
      };
    
    case 'RESET_RESEARCH_PROBLEMS':
        return {
          ...state,
          researchProblems: initialState.researchProblems
        };
    
    case 'SELECT_LLM_PROBLEM':
          return {
              ...state,
              researchProblems: {
                  ...state.researchProblems,
                  selectedProblem: {
                      title: action.payload.title,
                      description: action.payload.description,
                      isLLMGenerated: true
                  }
              }
    };

    case 'UPDATE_LLM_PROBLEM':
      return {
        ...state,
        researchProblems: {
          ...state.researchProblems,
          llm_problem: action.payload,
          selectedProblem: {
            title: action.payload.title,
            description: action.payload.description,
            isLLMGenerated: true,
            confidence: action.payload.confidence
          }
        },
        completedSteps: {
          ...state.completedSteps,
          researchProblems: true
        }
      };
    case 'SET_ORIGINAL_LLM_PROBLEM':
        return {
          ...state,
          researchProblems: {
            ...state.researchProblems,
            original_llm_problem: action.payload
          }
        };
        
    case 'UPDATE_LLM_PROBLEM':
        return {
          ...state,
          researchProblems: {
            ...state.researchProblems,
            llm_problem: action.payload,
            selectedProblem: {
              ...state.researchProblems.selectedProblem,
              title: action.payload.title,
              isLLMGenerated: true,
              confidence: action.payload.confidence
            }
          }
        };
    
    case 'SET_TEMPLATES':
      return {
        ...state,
        templates: {
          ...state.templates,
          available: action.payload,
          status: 'success'
        }
      };
      
    case 'UPDATE_LLM_TEMPLATE':
        return {
          ...state,
          templates: {
            ...state.templates,
            llm_template: action.payload
        }
    };

    case 'SET_SELECTED_TEMPLATE':
      return {
        ...state,
        templates: {
          ...state.templates,
          selectedTemplate: action.payload,
          status: 'success'
        },
        completedSteps: {
          ...state.completedSteps,
          templates: true
        }
    };

    case 'SET_TEMPLATE_STATUS': {
      return {
        ...state,
        templates: {
          ...state.templates,
          status: action.payload.status,
          processing_info: {
            ...state.templates.processing_info,
            step: action.payload.step,
            status: action.payload.status,
            progress: action.payload.progress,
            message: action.payload.message,
            timestamp: action.payload.timestamp
          }
        }
      };
    }

    case 'TRACK_EVALUATION_DATA': {
      const { step, data } = action.payload;
      return {
        ...state,
        evaluationData: {
          ...state.evaluationData,
          [step]: {
            timestamp: new Date().toISOString(),
            ...data
          }
        }
      };
      
    }
  
    case 'CLEAR_DATA_FROM_STEP': {
        const { stepIndex, currentStepIndex } = action.payload;
        let newState = { ...state };
        
        if (stepIndex <= 0) {
          // Going back to step 1 (or before) - clear everything
          newState = {
            ...newState,
            metadata: {
              ...newState.metadata,
              title: '',
              authors: [],
              abstract: '',
              doi: '',
              publicationDate: '',
            },
            researchFields: {
              fields: [], // Initialize as empty array
              selectedField: null,
              status: 'idle' // Reset status
            },
            researchProblems: {
              problems: [], // Initialize as empty array
              selectedProblem: null
            }
          };
        } else if (stepIndex <= 1) {
          // Going back to step 2 - clear research problems and reset research fields
          newState = {
            ...newState,
            researchFields: {
              fields: [], // Initialize as empty array
              selectedField: null,
              status: 'idle' // Reset status
            },
            researchProblems: {
              problems: [],
              selectedProblem: null
            }
          };
        }
        // ... rest of your cases
        
        return newState;
      }
      
    // Add a new case for initializing research fields
    case 'INITIALIZE_RESEARCH_FIELDS': {
        return {
          ...state,
          researchFields: {
            ...state.researchFields,
            fields: [], // Initialize as empty array
            status: 'idle'
          }
        };
      }

      case 'UPDATE_EVALUATION_DATA': {
        const { step, data } = action.payload;
        const timestamp = new Date().toISOString();
        
        const newEvaluationData = {
          ...state.evaluationData,
          [step]: data,
          completedSteps: {
            ...state.evaluationData.completedSteps,
            [step]: true
          },
          timestamp
        };
  
        // Only save if all required steps are complete
        /*if (isEvaluationComplete(newEvaluationData)) {
          console.log('All steps complete, saving evaluation data:', newEvaluationData);
          saveEvaluationData(
            state.evaluationData.token,
            newEvaluationData
          ).catch(error => {
            console.error('Failed to save evaluation data:', error);
          });
          console.log(state.evaluationData);
        } else {
          console.log(state.evaluationData);
          console.log('Evaluation data not yet complete:', {
            completed: Object.keys(newEvaluationData.completedSteps),
            pending: REQUIRED_STEPS.filter(step => !newEvaluationData.completedSteps[step])
          });
        }*/
  
        return {
          ...state,
          evaluationData: newEvaluationData
        };
      }
    
      case 'UPDATE_PAPER_CONTENT': {
        return {
          ...state,
          paperContent: action.payload
        };
      }

    default:
      return state;
  }
}

const AnalysisContext = createContext(undefined);

export function AnalysisProvider({ children }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);
  
  useEffect(() => {
    if (!state.navigation.isTransitioning) {
      return;
    }
  
    const intervalId = setInterval(() => {
      dispatch({ type: 'UPDATE_TRANSITION' });
    }, 50);
  
    return () => clearInterval(intervalId);
  }, [state.navigation.isTransitioning]);

  return (
    <AnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return context;
}

export function useAnalysisMode() {
  const { state, dispatch } = useAnalysis();
  const setAnalysisMode = (mode) => {
    dispatch({ type: 'SET_ANALYSIS_MODE', payload: mode });
  };
  return [state.analysisMode, setAnalysisMode];
}

export function useAnalysisError() {
  const { state, dispatch } = useAnalysis();
  const setError = (error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };
  return [state.error, setError];
}

export function useAnalysisProgress() {
  const { state } = useAnalysis();
  return state.progress;
}

export function useMetadata() {
  const { state, dispatch } = useAnalysis();
  const setMetadata = (metadata) => {
    dispatch({ type: 'SET_METADATA', payload: metadata });
  };
  return [state.metadata, setMetadata];
}

export function useResearchFields() {
  const { state, dispatch } = useAnalysis();
  const setResearchFields = (fields) => {
    dispatch({ type: 'SET_RESEARCH_FIELDS', payload: fields });
  };
  const selectField = (field) => {
    dispatch({ type: 'SELECT_RESEARCH_FIELD', payload: field });
  };
  return [state.researchFields, setResearchFields, selectField];
}

export function useStepNavigation() {
  const { state, dispatch } = useAnalysis();
  const currentStep = state.steps.find(step => step.id === state.currentStepId);
  const currentStepIndex = state.steps.findIndex(step => step.id === state.currentStepId);
  
  const canNavigateNext = () => {
    if (!currentStep) return false;
    
    switch (currentStep.id) {
      case 'metadata':
        return state.metadata.status === 'success' && !state.loading;
        
      case 'researchFields':
        return state.researchFields.selectedField && !state.loading;
        
      case 'researchProblems':
        return state?.researchProblems?.processing_info?.status === 'completed' && !state?.loading;

      case 'template':
         // Check for either LLM template or available templates with data
         return (state.templates?.llm_template || 
          (state.templates?.available?.templates && 
           Object.keys(state.templates.available.templates).length > 0)) && !state.loading;
           
      default:
        return state.completedSteps[currentStep.id] && !state.loading;
    }
  };
  
  const navigate = (direction) => {
    const targetStepId = direction === 'next' ? currentStep.nextStep : currentStep.prevStep;
    if (!targetStepId) return;
    
    if (direction === 'next' && currentStep.id === 'researchFields') {
      dispatch({ type: 'COMPLETE_STEP', payload: 'researchFields' });
    }
    
    dispatch({
      type: 'START_NAVIGATION',
      payload: { direction, targetStep: targetStepId }
    });
    
    dispatch({ type: 'SET_CURRENT_STEP', payload: targetStepId });
  };
  console.log(state.steps,state.steps.length);
  return {
    currentStep,
    currentStepIndex,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === state.steps.length - 1,
    canNavigateNext,
    navigate,
    isNavigating: state.navigation.isNavigating,
    navigationProgress: state.navigation.progress
  };
}

export function useStepProgress() {
  const { state } = useAnalysis();
  return {
    overallProgress: state.progress,
    completedSteps: state.completedSteps,
    currentStepId: state.currentStepId
  };
}

export const useTrackEvaluation = () => {
  const { state, dispatch } = useAnalysis();
  
  const trackEvaluation = (step, data) => {
    if (!REQUIRED_STEPS.includes(step)) {
      console.warn(`Invalid step "${step}" being tracked. Valid steps are: ${REQUIRED_STEPS.join(', ')}`);
      return;
    }

    if (!data) {
      console.warn(`Attempted to track evaluation for ${step} with no data`);
      return;
    }

    dispatch({
      type: 'UPDATE_EVALUATION_DATA',
      payload: { step, data }
    });
  };

  return trackEvaluation;
};