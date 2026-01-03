import { env } from 'next-runtime-env';
import React from 'react';
import { Card, CardBody, Badge, Progress } from 'reactstrap';
import { ExternalLink, Route, User, Calendar, Link, Atom, AlertTriangle, Target, Sparkles, BookOpen } from 'lucide-react';
import { useAnalysis } from '../automatic-creation/contexts/AnalysisContext';

const Header = () => {
  const { state } = useAnalysis();
  const { 
    metadata, 
    analysisMode, 
    currentStepId, 
    steps, 
    progress, 
    researchFields, 
    researchProblems,
    templates
  } = state;
  
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);

  const fadeInStyle = {
    animation: 'fadeIn 0.5s ease-in forwards'
  };

  const getFieldColor = () => {
    if (!researchFields.selectedField) return '';
    return (researchFields.selectedField.score * 10) >= 50 ? 'text-success' : 'text-warning';
  };

  const getProblemColor = () => {
    const confidence = getProblemConfidence();
    return confidence >= 0.5 ? 'text-success' : 'text-warning';
  };

  const getProblemText = () => {
    if (researchProblems?.selectedProblem?.id && researchProblems?.orkg_problems) {
      const selectedProblem = researchProblems.orkg_problems.find(
        problem => problem.id === researchProblems.selectedProblem.id
      );
      return 'Research Problem: '+selectedProblem?.description || '';
    } else if (researchProblems?.llm_problem?.title) {
      return 'AI Generated Research Problem: '+researchProblems.llm_problem.title;
    }
    return '';
  };

  const getProblemConfidence = () => {
    if (researchProblems?.selectedProblem?.confidence_score) {
      return researchProblems.selectedProblem.confidence_score;
    } else if (researchProblems?.llm_problem?.confidence) {
      return researchProblems.llm_problem.confidence;
    }
    return 0;
  };

  const getProblemIcon = () => {
    if (researchProblems?.llm_problem) {
      return <Sparkles size={14} className="me-1 text-purple-500" />;
    }
    return <Target size={14} className="me-1" />;
  };

  const getProblemStyle = () => {
    if (researchProblems?.llm_problem) {
      return 'text-primary';
    }
    return getProblemColor();
  };

  const renderTemplateInfo = () => {
    if (currentStepIndex < 3) return null;

    if (templates?.selectedTemplate) {
      return (
        <div className="d-flex align-items-center small mb-1" style={fadeInStyle}>
          <BookOpen size={14} className="me-1" />
          <span className="me-2">Template: {templates.selectedTemplate.name}</span>
          <a 
            href={`${env('NEXT_PUBLIC_URL')}/template/${templates.selectedTemplate.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      );
    } else if (templates?.llm_template) {
      const propertyCount = templates.llm_template.template.properties?.length || 0;
      return (
        <div className="d-flex align-items-center small mb-1" style={fadeInStyle}>
          <Sparkles size={14} className="me-1 text-purple-500" />
          <span className="me-2 text-danger">AI Generated Template: {templates.llm_template.template.name} ({propertyCount} properties)</span>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-4 shadow-sm">
      <CardBody>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="mb-1">{metadata.title || 'Paper Analysis'}</h5>
            {metadata.authors?.length > 0 && (
              <div className="d-flex align-items-center text-muted small mb-1">
                <User size={14} className="me-1" />
                {metadata.authors.join(', ')}
              </div>
            )}
            {metadata.doi && (
              <div className="d-flex align-items-center text-muted small mb-1">
                <Link size={14} className="me-2" />
                <a 
                  href={metadata.doi}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 d-inline-flex align-items-center ms-1"
                >
                  {metadata.doi}
                  <ExternalLink size={14} className="ms-1" />
                </a>
                {metadata.publicationDate && (
                  <div className="d-flex align-items-center ms-5">
                    <Calendar size={14} className="me-2 text-primary" />
                    <span>
                      {new Date(metadata.publicationDate).getFullYear()}
                    </span>
                  </div>
                )}
              </div>
            )}
            {researchFields.selectedField && (
              <div 
                className={`d-flex align-items-center small mb-1 ${getFieldColor()}`}
                style={fadeInStyle}
              >
                <Atom size={14} className="me-1" />
                <span className="me-2">Research Field: {researchFields.selectedField.name}</span>
                <a 
                  href={`${env('NEXT_PUBLIC_URL')}/field/${researchFields.selectedField?.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary"
                >
                  <ExternalLink size={14} />
                </a>
                <div className="d-flex align-items-center gap-2">
                  {(Math.round(researchFields.selectedField.score * 10)) >= 50 ? (
                    <Badge 
                      color="success" 
                      pill 
                      className="ms-2"
                      style={{ fontSize: '0.7rem', padding: '0.2em 0.6em' }}
                    >
                      High Confidence
                    </Badge>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="text-warning" />
                      <span className="text-warning" style={{ fontSize: '0.75rem' }}>
                        Not recommended but selectable
                      </span>
                    </>
                  )}
                  <span className="ms-2 text-muted" style={{ fontSize: '0.75rem' }}>
                    (Similarity: {Math.round(researchFields.selectedField.score * 10)}%)
                  </span>
                </div>
              </div>
            )}
            {currentStepIndex >= 2 && (researchProblems?.selectedProblem || researchProblems?.llm_problem) && (
              <div 
                className={`d-flex align-items-center small mb-1 ${getProblemStyle()}`}
                style={fadeInStyle}
              >
                {getProblemIcon()}
                <span className="me-2">{getProblemText()}</span>
                {researchProblems?.llm_problem ? (
                  <Badge 
                    color="text-secondary"
                    pill 
                    className="ms-2"
                    style={{ fontSize: '0.7rem', padding: '0.2em 0.6em' }}
                  >
                    AI Generated
                  </Badge>
                ) : (
                  <div className="d-flex align-items-center gap-2">
                    {getProblemConfidence() >= 0.5 ? (
                      <Badge 
                        color="success" 
                        pill 
                        className="ms-2"
                        style={{ fontSize: '0.7rem', padding: '0.2em 0.6em' }}
                      >
                        High Similarity
                      </Badge>
                    ) : (
                      <>
                        <AlertTriangle size={14} className="text-warning" />
                        <span className="text-warning" style={{ fontSize: '0.75rem' }}>
                          Low Similarity
                        </span>
                      </>
                    )}
                    <span className="ms-2 text-muted" style={{ fontSize: '0.75rem' }}>
                      (Similarity: {Math.round(getProblemConfidence() * 100)}%)
                    </span>
                  </div>
                )}
              </div>
            )}
            {renderTemplateInfo()}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex gap-3">
            <div className="d-flex align-items-center">
              <Route size={20} className="me-2 text-primary" />
              <span className="small">Step {currentStepIndex + 1}/{steps.length}</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2" style={{ width: '240px' }}>
            <span className="small text-muted">Progress:</span>
            <div className="flex-grow-1">
              <Progress
                value={progress}
                className="progress-xs"
                style={{ height: '8px' }}
              />
            </div>
            <span className="small text-muted" style={{ width: '48px' }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .gap-2 {
            gap: 0.5rem;
          }

          .gap-3 {
            gap: 1rem;
          }

          .progress-xs {
            height: 4px;
            border-radius: 2px;
          }
        `}</style>
      </CardBody>
    </Card>
  );
};

export default Header;