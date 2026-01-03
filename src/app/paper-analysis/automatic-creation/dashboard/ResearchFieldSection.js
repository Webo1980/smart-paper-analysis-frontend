import { env } from 'next-runtime-env';
import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardBody, FormGroup, Label, Input, Alert, Badge } from 'reactstrap';
import { Atom, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAnalysis, useTrackEvaluation } from '../contexts/AnalysisContext';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import AutoTransition from '../../common/AutoTransition';
import { classifyPaper } from '../../../../services/orkgNlp';

const ResearchFieldSection = () => {
  const trackEvaluation = useTrackEvaluation();
  const { state, dispatch } = useAnalysis();
  const { metadata, researchFields } = state;
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [fieldLinks, setFieldLinks] = useState({});
  const [usingFallback, setUsingFallback] = useState(false);

  // Hard-coded fallback research fields function
  const getFallbackResearchFields = () => {
    return [
      { 
        id: 'R112118', 
        name: 'Computer Vision and Pattern Recognition', 
        description: 'The field focused on enabling computers to gain high-level understanding from digital images or videos, and to identify and recognize patterns.',
        score: 9
      },
      { 
        id: 'R136139', 
        name: 'Radiology, Nuclear Medicine, Radiotherapy, Radiobiology', 
        description: 'The medical specialty that uses medical imaging to diagnose and treat diseases within the bodies of humans and animals.',
        score: 8.5
      },
      { 
        id: 'R112125', 
        name: 'Machine Learning', 
        description: 'The study of algorithms and statistical models that computer systems use to perform tasks without explicit instructions, often by recognizing patterns in data.',
        score: 8
      },
      { 
        id: 'R136131', 
        name: 'Medical Microbiology and Mycology, Hygiene, Molecular Infection Biology', 
        description: 'The study of microorganisms and their role in human health and disease, including virology and infectious disease diagnosis.',
        score: 7.5
      },
      { 
        id: 'R208', 
        name: 'Bioimaging and biomedical optics', 
        description: 'The development and application of imaging technologies for the acquisition of structural and functional information in biological and medical systems.',
        score: 7
      }
    ];
  };

  async function findResearchFieldIdByLabel(label) {
    try {
      const url = `${env('NEXT_PUBLIC_BACKEND_URL')}/api/resources?q=${encodeURIComponent(label)}&exact=true`;
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      for (const item of data.content) {
        if (item.classes.includes("ResearchField")) {
          return item.id;
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  }

  const findTopConfidenceField = useCallback((fields) => {
    if (!fields?.length) return null;
    return fields.reduce((prev, current) => 
      (current.score > prev.score) ? current : prev
    );
  }, []);

  useEffect(() => {
    if (researchFields.fields?.length > 0) {
      trackEvaluation('researchFields', {
        predictions: researchFields.fields,
        selectedField: researchFields.selectedField,
        confidence_scores: researchFields.fields.map(f => f.score),
        usingFallback: usingFallback
      });
    }
  }, [researchFields.selectedField, usingFallback]);

  useEffect(() => {
    const analyzeResearchFields = async () => {
      try {
        const response = await classifyPaper({
          smartSuggestionInputText: metadata?.title + " " + metadata?.abstract,
          topN: 5
        });

        const links = {};
        for (const field of response.payload.annotations) {
          const id = await findResearchFieldIdByLabel(field.research_field);
          if (id) {
            links[field.research_field] = id;
          }
        }
        setFieldLinks(links);

        const transformedFields = response.payload.annotations.map(field => ({
          id: links[field.research_field] || field.research_field,
          name: field.research_field,
          score: field.score,
          description: ''
        }));
       
        console.log('transformedFields', transformedFields);
        dispatch({ type: 'SET_RESEARCH_FIELDS', payload: transformedFields });
        dispatch({ 
          type: 'SET_RESEARCH_FIELDS_STATUS', 
          payload: {
            status: 'completed',
            step: 'researchFields',
            progress: 100,
            message: 'Research fields identified successfully',
            timestamp: new Date().toISOString()
          }
        });
        setUsingFallback(false);
      } catch (error) {
        console.error('API classification failed, using fallback fields:', error);
        
        // Use fallback fields when API fails
        const fallbackFields = getFallbackResearchFields();
        dispatch({ type: 'SET_RESEARCH_FIELDS', payload: fallbackFields });
        dispatch({ 
          type: 'SET_RESEARCH_FIELDS_STATUS', 
          payload: {
            status: 'completed',
            step: 'researchFields',
            progress: 100,
            message: 'Using fallback research fields due to API failure',
            timestamp: new Date().toISOString()
          }
        });
        setUsingFallback(true);
      }
    };

    if (metadata?.title || metadata?.abstract) {
      analyzeResearchFields();
    }
  }, [metadata]);

  useEffect(() => {
    if (!researchFields.fields?.length) return;

    const topField = findTopConfidenceField(researchFields.fields);
    if (topField) {
      setSelectedFieldId(topField.id);
      dispatch({ type: 'SELECT_RESEARCH_FIELD', payload: topField });
      
      if (state.analysisMode === 'automatic') {
        handleAnalysis(topField.id);
      }
    }
  }, [researchFields.fields, state.analysisMode]);

  const handleFieldSelection = (event) => {
    const fieldId = event.target.value;
    const selected = researchFields.fields.find(field => field.id === fieldId);
    if (selected) {
      setSelectedFieldId(selected.id);
      dispatch({ type: 'SELECT_RESEARCH_FIELD', payload: selected });
    }
  };

  const getBorderColorClass = useCallback((field) => {
    if (field.id === selectedFieldId) {
      return (field.score * 10) >= 50 ? 'border-success' : 'border-warning';
    }
    return '';
  }, [selectedFieldId]);

  const renderContent = () => {
    // Show loading when processing or no fields yet
    if (researchFields.status === 'idle' || 
        researchFields.status === 'processing' || 
        (researchFields.status === 'completed' && !researchFields.fields)) {
      return (
        <LoadingSpinner 
          color="#ff0000"
          size={64}
          text={["Analyzing research fields...", "Preparing results..."]}
          textClassName="text-lg font-bold"
        />
      );
    }

    // Show no data message
    if (researchFields.status === 'completed' && (!researchFields.fields || researchFields.fields.length === 0)) {
      return (
        <Alert color="warning" className="m-0">
          No research fields could be identified. Please try again or contact support.
        </Alert>
      );
    }

    // Show fields data
    return (
      <>
        <div className="mb-4">
          <p className="text-muted">
            {state.analysisMode === 'automatic' 
              ? "Automatically analyzing research fields" 
              : "Select the most relevant research field"}
          </p>
          {usingFallback && (
            <Alert color="info" className="mb-3">
              <AlertTriangle size={16} className="me-2" />
              Using fallback research fields due to API connection issues
            </Alert>
          )}
        </div>

        {state.error && (
          <Alert color="danger" className="mb-4">{state.error}</Alert>
        )}

        {selectedFieldId && researchFields.fields.find(f => f.id === selectedFieldId)?.score * 10 < 50 && (
          <Alert color="warning" className="mb-4">
            <div className="d-flex">
              <AlertTriangle size={20} className="me-2 flex-shrink-0" />
              <div>
                <strong>Low Confidence Selection</strong>
                <div>
                  The selected field has a similarity score below 50%. While you can proceed with this selection,
                  it's recommended to choose a field with a higher similarity score for better analysis results.
                </div>
              </div>
            </div>
          </Alert>
        )}

        <div className="mb-4">
          <div className="d-flex flex-column gap-3">
            {[...researchFields.fields]
              .sort((a, b) => b.score - a.score)
              .map(field => {
                const isHighestScore = field.id === findTopConfidenceField(researchFields.fields)?.id;
                const borderClass = getBorderColorClass(field);
                const isSelected = field.id === selectedFieldId;

                return (
                  <FormGroup 
                    key={field.id} 
                    className={`border rounded p-3 ${borderClass} ${borderClass ? 'border-2' : ''}`}
                  >
                    <div className="d-flex align-items-center">
                      {state.analysisMode !== 'automatic' && (
                        <Input
                          type="radio"
                          name="researchField"
                          id={field.id}
                          value={field.id}
                          checked={isSelected}
                          onChange={handleFieldSelection}
                          className="me-3"
                        />
                      )}
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2">
                          <Label for={field.id} className="mb-0 fw-medium">
                            {field.name}
                            <a 
                              href={`${env('NEXT_PUBLIC_URL')}/field/${field.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ms-2 text-primary"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </Label>
                          {isHighestScore && (
                            <Badge color="success" pill>
                              Recommended
                            </Badge>
                          )}
                        </div>
                        {field.description && (
                          <p className="text-muted small mb-0 mt-1">{field.description}</p>
                        )}
                        {isHighestScore && state.analysisMode === 'automatic' && (
                          <p className="text-success small mb-0 mt-1">
                            Selected for research problems analysis
                          </p>
                        )}
                        {isSelected && !isHighestScore && (field.score * 10) < 50 && (
                          <p className="text-warning small mb-0 mt-1">
                            Low similarity selection - Consider alternatives with higher similarity score
                          </p>
                        )}
                      </div>
                      <div className="text-muted small">
                        Similarity: {Math.round(field.score * 10)}%
                      </div>
                    </div>
                  </FormGroup>
                );
              })}
          </div>
          {state.analysisMode === 'automatic' && <AutoTransition />}
        </div>
      </>
    );
  };

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
        <h5 className="mb-0 text-white" style={{ fontSize: '16px', fontWeight: '500' }}>
          <Atom className="me-2" size={20} />
          Research Fields Analysis
        </h5>
      </div>

      <Card>
        <CardBody>
          {renderContent()}
        </CardBody>
      </Card>
    </div>
  );
};

export default ResearchFieldSection;