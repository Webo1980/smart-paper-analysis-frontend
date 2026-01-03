import { env } from 'next-runtime-env';
import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardBody, Alert, FormGroup, Label, Input, Badge } from 'reactstrap';
import { ExternalLink, AlertTriangle, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useAnalysis, useTrackEvaluation } from '../../contexts/AnalysisContext';
import AIResearchProblemSuggestion from './AIResearchProblemSuggestion';
import { LoadingSpinner } from '../../../common/LoadingSpinner';
import AutoTransition from '../../../common/AutoTransition';
import ApiService from '../../../services/ApiService';
import { getLLMService } from '../../../services/GenericLLMService';
import Tippy from '@tippyjs/react';

const formatPercentage = (value) => {
  if (!value && value !== 0) return '0%';
  return `${Math.round(value * 100)}%`;
};

const Tooltip = ({ children, message, tippyProps = {} }) => (
  <Tippy content={message} {...tippyProps}>
    <span>{children}</span>
  </Tippy>
);

const PaperPropertyBadge = ({ property }) => (
  <Tooltip message={property.description || 'No description available'}>
    <a
      href={`${env('NEXT_PUBLIC_URL')}/property/${property.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block px-2 py-1 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 mr-2 mb-2 cursor-pointer transition-colors"
    >
      {property.label}
    </a>
  </Tooltip>
);

const PaperItem = ({ paper }) => {
  const properties = paper.template?.properties || [];
  return (
    <div className="border rounded p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <h6 className="mb-0 text-lg font-medium">{paper.title}</h6>
        <a
          href={`${env('NEXT_PUBLIC_URL')}/paper/${paper.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <span className="text-sm">View Paper</span>
          <ExternalLink size={14} />
        </a>
      </div>
      <div className="flex flex-wrap mt-2">
        {properties.map(prop => (
          <PaperPropertyBadge key={prop.id} property={prop} />
        ))}
      </div>
    </div>
  );
};

const ResearchProblemCard = ({ problem, isHighestScore, isSelected, borderClass, onSelect, analysisMode, threshold }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <FormGroup className={`border rounded p-3 ${borderClass} ${borderClass ? 'border-2' : ''}`}>
      <div className="d-flex">
        {analysisMode !== 'automatic' && (
          <Input
            type="radio"
            name="researchProblem"
            id={problem.id}
            value={problem.id}
            checked={isSelected}
            onChange={onSelect}
            className="me-3 mt-1"
          />
        )}
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-start justify-content-between">
            <div className="d-flex align-items-start gap-2 flex-grow-1">
              <div className="d-flex align-items-center gap-2">
                <Label for={problem.id} className="mb-0 fw-medium text-break">
                  {problem.description}
                </Label>
                <a
                  href={`https://orkg.org/resource/${problem.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary d-inline-flex align-items-center gap-1 small ms-2"
                >
                  View
                  <ExternalLink size={14} />
                </a>
                {isHighestScore && (
                  <Badge color="success" pill>
                    Recommended
                  </Badge>
                )}
              </div>
            </div>
            <span className="text-muted small ms-3 flex-shrink-0">
              Score: {formatPercentage(problem.confidence_score)}
            </span>
          </div>
          <div className="d-flex align-items-center cursor-pointer mb-2" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
            <h6 className="mb-0 me-2">
              {isExpanded ? 'Hide related papers' : 'Show related papers sample'}
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </h6>
          </div>
          {isHighestScore && analysisMode === 'automatic' && (
            <p className="text-success small mb-0 mt-1">
              Selected for template detection
            </p>
          )}
          {isSelected && !isHighestScore && problem.confidence_score < threshold && (
            <p className="text-warning small mb-0 mt-1">
              Low confidence selection - Consider alternatives with higher scores
            </p>
          )}
          {isExpanded && problem.top_papers && problem.top_papers.length > 0 && (
            <div className="mt-3">
              <h6 className="small fw-semibold mb-2">Related Papers</h6>
              {problem.top_papers.map(paper => (
                <PaperItem key={paper.id} paper={paper} />
              ))}
            </div>
          )}
        </div>
      </div>
    </FormGroup>
  );
};

const MetadataSection = ({ metadata }) => (
  <div className="row mb-4 bg-light rounded p-3">
    <div className="col-md-3">
      <p className="text-muted mb-1">Total Scanned</p>
      <p className="h5 mb-0">{metadata?.total_scanned || 0}</p>
    </div>
    <div className="col-md-3">
      <p className="text-muted mb-1">Similar Problems</p>
      <p className="h5 mb-0">{metadata?.total_similar || 0}</p>
    </div>
    <div className="col-md-3">
      <p className="text-muted mb-1">Max Similarity</p>
      <p className="h5 mb-0">{formatPercentage(metadata?.max_similarity)}</p>
    </div>
    <div className="col-md-3">
      <p className="text-muted mb-1">Threshold</p>
      <p className="h5 mb-0">{formatPercentage(metadata?.threshold_used)}</p>
    </div>
  </div>
);

const ResearchProblemsSection = () => {
  const trackEvaluation = useTrackEvaluation();
  const { state, dispatch } = useAnalysis();
  const { researchProblems, researchFields, metadata } = state;
  const abstract = metadata?.abstract;
  const [isLoading, setIsLoading] = useState(true);
  const [llmAnalysis, setLlmAnalysis] = useState(null);
  const [llmError, setLlmError] = useState(null);

  const findTopConfidenceProblem = useCallback((problems) => {
    if (!problems?.length) return null;
    return problems.reduce((prev, current) =>
      (current.confidence_score > prev.confidence_score) ? current : prev
    );
  }, []);

  useEffect(() => {
    if (researchProblems.selectedProblem) {
      trackEvaluation('researchProblems', {
        predictions: researchProblems.orkg_problems,
        selectedProblem: researchProblems.selectedProblem,
        llm_problem: researchProblems.llm_problem,
        metadata: researchProblems.metadata
      });
    }
  }, [researchProblems.selectedProblem]);

  useEffect(() => {
    const analyzeProblems = async () => {
      if (!researchFields.selectedField?.id || !abstract) return;
      
      setIsLoading(true);
      try {
        const llmService = getLLMService();
        const llmResult = await llmService.extractResearchProblem(abstract);
        setLlmAnalysis(llmResult);
        
        const apiService = ApiService.getInstance();
        const response = await apiService.analyzeResearchProblems(
          researchFields.selectedField.id,
          llmResult
        );

        if (response?.orkg_problems?.length > 0) {
          const topProblem = findTopConfidenceProblem(response.orkg_problems);
          console.log("topProblem",topProblem);
          console.log('state in reserch problem',state);
          dispatch({ type: 'SET_RESEARCH_PROBLEMS', payload: response });
          console.log('state in reserch problem',state);
          dispatch({ type: 'SELECT_RESEARCH_PROBLEM', payload: topProblem });
          console.log('state in reserch problem',state);
          dispatch({ type: 'SET_RESEARCH_PROBLEMS_STATUS', payload: 'completed' });
          console.log('state in reserch problem',state);
        }
      } catch (error) {
        setLlmError(error.message);
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    analyzeProblems();
  }, [researchFields.selectedField?.id, abstract]);

  const handleProblemSelection = (event) => {
    const selectedProblem = researchProblems.orkg_problems.find(p => p.id === event.target.value);
    if (selectedProblem) {
      dispatch({ type: 'SELECT_RESEARCH_PROBLEM', payload: selectedProblem });
    }
  };

  const getBorderColorClass = useCallback((problem, isHighestScore) => {
    if (state.analysisMode === 'automatic' && isHighestScore) {
      return 'border-success';
    }
    if (problem.id === researchProblems.selectedProblem?.id) {
      return problem.confidence_score >= (researchProblems.metadata?.threshold_used || 0.5)
        ? 'border-success'
        : 'border-warning';
    }
    return '';
  }, [researchProblems.selectedProblem?.id, researchProblems.metadata?.threshold_used, state.analysisMode]);

  if (isLoading) {
    return (
      <div className="position-relative mt-5">
        <div className="position-absolute" style={{
          top: '-29px',
          background: '#e86161',
          padding: '5px 10px',
          borderRadius: '8px 8px 0 0',
          border: '1px solid #0a58ca',
          borderBottom: 'none',
          boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
        }}>
          <h5 className="mb-0 text-white d-flex align-items-center gap-2" style={{ fontSize: '16px', fontWeight: '500' }}>
            <Target size={20} />
            Research Problems Analysis
          </h5>
        </div>
        <Card>
          <CardBody>
            <LoadingSpinner
              color="#ff0000"
              size={64}
              text={[
                "Scanning research problems...",
                "Computing similarities...",
                "Preparing results...",
                "Almost done...",
              ]}
              textClassName="text-lg font-bold"
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const hasOrkgProblems = researchProblems.orkg_problems?.length > 0;

  return (
    <div className="position-relative mt-5">
      <div className="position-absolute" style={{
        top: '-29px',
        background: '#e86161',
        padding: '5px 10px',
        borderRadius: '8px 8px 0 0',
        border: '1px solid #0a58ca',
        borderBottom: 'none',
        boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
      }}>
        <h5 className="mb-0 text-white d-flex align-items-center gap-2" style={{ fontSize: '16px', fontWeight: '500' }}>
          <Target size={20} />
          Research Problems Analysis
        </h5>
      </div>
      <Card>
        <CardBody>
          {llmError && !llmError.includes('API key not found') && (
            <Alert color="danger" className="mb-4">
              <div className="d-flex">
                <AlertTriangle size={20} className="me-2 flex-shrink-0" />
                <div>
                  <strong>LLM Analysis Error</strong>
                  <div>{llmError}</div>
                </div>
              </div>
            </Alert>
          )}
          
          {hasOrkgProblems && (
            <div className="mb-4">
              <p className="text-muted">
                {state.analysisMode === 'automatic'
                  ? "Automatically analyzing research problems"
                  : "Select the most relevant research problem"}
              </p>
            </div>
          )}

          {researchProblems.selectedProblem &&
           researchProblems.selectedProblem.confidence_score < (researchProblems.metadata?.threshold_used || 0.5) && (
            <Alert color="warning" className="mb-4">
              <div className="d-flex">
                <AlertTriangle size={20} className="me-2 flex-shrink-0" />
                <div>
                  <strong>Low Confidence Selection</strong>
                  <div>
                    The selected problem has a confidence score below {formatPercentage(researchProblems.metadata?.threshold_used)}.
                    While you can proceed with this selection, it's recommended to choose a problem with a higher confidence score.
                  </div>
                </div>
              </div>
            </Alert>
          )}

          <MetadataSection metadata={researchProblems.metadata} />
          
          {hasOrkgProblems ? (
            <div className="mb-4">
              <div className="d-flex flex-column gap-3">
                {[...researchProblems.orkg_problems]
                  .sort((a, b) => b.confidence_score - a.confidence_score)
                  .map((problem) => {
                    const isHighestScore = problem.id === findTopConfidenceProblem(researchProblems.orkg_problems)?.id;
                    const borderClass = getBorderColorClass(problem, isHighestScore);
                    return (
                      <ResearchProblemCard
                        key={problem.id}
                        problem={problem}
                        isHighestScore={isHighestScore}
                        isSelected={problem.id === researchProblems.selectedProblem?.id}
                        borderClass={borderClass}
                        onSelect={handleProblemSelection}
                        analysisMode={state.analysisMode}
                        threshold={researchProblems.metadata?.threshold_used || 0.5}
                      />
                    );
                  })}
              </div>
              {state.analysisMode === 'automatic' && <AutoTransition />}
            </div>
          ) : (
            <>
              <Alert color="warning" className="mb-4">
                No ORKG research problems could be identified.
              </Alert>
              {llmAnalysis && !llmError && (
                <AIResearchProblemSuggestion
                  llmProblem={llmAnalysis}
                  onUpdate={(problem) => dispatch({ type: 'UPDATE_LLM_PROBLEM', payload: problem })}
                  formatPercentage={formatPercentage}
                />
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ResearchProblemsSection;