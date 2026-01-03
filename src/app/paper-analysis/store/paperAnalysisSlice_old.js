import { createSlice } from '@reduxjs/toolkit';

const steps = [
  { 
    id: 'metadata', 
    label: 'Metadata Analysis',
    transitionDelay: 5000,
    nextStep: 'research-fields',
    prevStep: null,
  },
  { 
    id: 'research-fields', 
    label: 'Research Field Identification',
    transitionDelay: 10000,
    nextStep: 'research-problem',
    prevStep: 'metadata',
  },
  { 
    id: 'research-problem', 
    label: 'Research Problem Discovery',
    transitionDelay: 15000,
    nextStep: 'template',
    prevStep: 'research-fields',
  },
  { 
    id: 'template', 
    label: 'Template Detection',
    transitionDelay: 12000,
    nextStep: 'content',
    prevStep: 'research-problem',
  },
  { 
    id: 'content', 
    label: 'Content Analysis',
    transitionDelay: 8000,
    nextStep: null,
    prevStep: 'template',
  }
];

const initialState = {
  // Step Configuration
  steps,
  currentStep: steps[0],
  
  // Global UI State
  analysisMode: 'automatic',
  isProcessing: false,
  error: null,
  completedSteps: {},
  
  // Navigation State
  navigationState: {
    isNavigating: false,
    direction: null,
    targetStep: null,
    progress: 0
  },
  
  // Data States
  paperUrl: '',
  
  // Metadata Step Data
  metadata: {
    fields: {
      title: { present: false, value: null },
      authors: { present: false, value: null },
      abstract: { present: false, value: null },
      doi: { present: false, value: null },
      url: { present: false, value: null },
      publication_date: { present: false, value: null }
    },
    processing: {
      status: 'idle', // idle | processing | completed | error
      progress: 0,
      error: null
    }
  },
  
  // Research Fields Step Data
  researchFields: {
    fields: [],
    selectedField: null,
    processing: {
      status: 'idle',
      progress: 0,
      error: null
    }
  },
  
  // Research Problems Step Data
  researchProblems: {
    problems: [],
    selectedProblem: null,
    metadata: {
      total_scanned: 0,
      total_identified: 0,
      total_similar: 0
    },
    processing: {
      status: 'idle',
      progress: 0,
      error: null
    }
  },
  
  // Template Step Data
  templates: {
    available: [],
    selectedTemplate: null,
    metadata: {
      total_papers_found: 0,
      papers_with_templates: 0,
      total_templates: 0
    },
    processing: {
      status: 'idle',
      progress: 0,
      error: null
    }
  },
  
  // Content Analysis Step Data
  contentAnalysis: {
    sections: [],
    images: [],
    tables: [],
    processing: {
      status: 'idle',
      progress: 0,
      error: null
    }
  }
};

const paperAnalysisSlice = createSlice({
  name: 'paperAnalysis',
  initialState,
  reducers: {
    // Global Actions
    setCurrentStep: (state, action) => {
      const targetStep = state.steps.find(step => step.id === action.payload);
      if (targetStep) {
        state.currentStep = targetStep;
      }
    },
    
    setProcessingState: (state, action) => {
      const { stepId, status, progress = 0, error = null } = action.payload;
      if (state[stepId]?.processing) {
        state[stepId].processing = {
          status,
          progress,
          error
        };
      }
    },
    
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    completeStep: (state, action) => {
      state.completedSteps[action.payload] = true;
    },
    
    // Navigation Actions
    startNavigation: (state, action) => {
      state.navigationState = {
        isNavigating: true,
        ...action.payload,
        progress: 0
      };
    },
    
    updateNavigationProgress: (state, action) => {
      state.navigationState.progress = action.payload;
    },
    
    endNavigation: (state) => {
      state.navigationState = initialState.navigationState;
    },
    
    // Data Actions
    setPaperUrl: (state, action) => {
      state.paperUrl = action.payload;
    },
    
    setAnalysisMode: (state, action) => {
      state.analysisMode = action.payload;
    },
    
    // Metadata Actions
    setMetadata: (state, action) => {
      state.metadata.fields = {
        ...state.metadata.fields,
        ...action.payload
      };
    },
    
    // Research Fields Actions
    setResearchFields: (state, action) => {
      state.researchFields.fields = action.payload;
    },
    
    selectField: (state, action) => {
      state.researchFields.selectedField = action.payload;
    },
    
    // Research Problems Actions
    setResearchProblems: (state, action) => {
      const { problems, metadata } = action.payload;
      state.researchProblems.problems = problems;
      if (metadata) {
        state.researchProblems.metadata = metadata;
      }
    },
    
    selectProblem: (state, action) => {
      state.researchProblems.selectedProblem = action.payload;
    },
    
    // Template Actions
    setTemplates: (state, action) => {
      const { templates, metadata } = action.payload;
      state.templates.available = templates;
      if (metadata) {
        state.templates.metadata = metadata;
      }
    },
    
    selectTemplate: (state, action) => {
      state.templates.selectedTemplate = action.payload;
    },
    
    // Content Analysis Actions
    setContentAnalysis: (state, action) => {
      const { sections, images, tables } = action.payload;
      state.contentAnalysis = {
        ...state.contentAnalysis,
        sections: sections || state.contentAnalysis.sections,
        images: images || state.contentAnalysis.images,
        tables: tables || state.contentAnalysis.tables
      };
    }
  }
});

// Export actions
export const {
  setCurrentStep,
  setProcessingState,
  setError,
  completeStep,
  startNavigation,
  updateNavigationProgress,
  endNavigation,
  setPaperUrl,
  setAnalysisMode,
  setMetadata,
  setResearchFields,
  selectField,
  setResearchProblems,
  selectProblem,
  setTemplates,
  selectTemplate,
  setContentAnalysis
} = paperAnalysisSlice.actions;

// Selectors
export const selectCurrentStep = (state) => state.paperAnalysis.currentStep;
export const selectStepById = (state, stepId) => 
  state.paperAnalysis.steps.find(step => step.id === stepId);
export const selectIsStepCompleted = (state, stepId) => 
  Boolean(state.paperAnalysis.completedSteps[stepId]);
export const selectNavigationState = (state) => 
  state.paperAnalysis.navigationState;
export const selectStepProcessing = (state, stepId) => 
  state.paperAnalysis[stepId]?.processing || { status: 'idle', progress: 0, error: null };

export default paperAnalysisSlice.reducer;