'use client';
import React from 'react';
import { useAnalysis } from '../contexts/AnalysisContext';
import Header from '../../common/Header';
import { ErrorDisplay } from '../../common/ErrorBoundary';
import MetadataSection from './MetaData/MetadataSection';
import ResearchFieldSection from './ResearchFieldSection';
import ResearchProblemsSection from './ResearchProblem/ResearchProblem';
import TemplateViewer  from './Templates/TemplateViewer';
import ContentAnalysis  from './ContentAnalysis/ContentAnalysis';
import FinalStep from './FinalStep.js';
import StepTabs from '../../common/StepTabs';
import StepNavigation from '../../common/StepNavigation';

const PaperAnalysis = () => {
  const { state } = useAnalysis();
  
  // Render the appropriate section based on current step
  const renderCurrentSection = () => {
    switch (state.currentStepId) {
      case 'metadata':
        return <MetadataSection />;
      case 'researchFields':
        return <ResearchFieldSection />;
      case 'researchProblems':
        return <ResearchProblemsSection />;
      case 'template':
        return <TemplateViewer />;
      case 'paperContent':
        return <ContentAnalysis />;
      case 'FinalStep':
          return <FinalStep />;
      default:
        return <MetadataSection />;
    }
  };

  return (
    <div className="container py-4">
      <StepTabs />
      <Header />
      <ErrorDisplay />
      {renderCurrentSection()}
      <StepNavigation />
    </div>
  );
};

export default PaperAnalysis;