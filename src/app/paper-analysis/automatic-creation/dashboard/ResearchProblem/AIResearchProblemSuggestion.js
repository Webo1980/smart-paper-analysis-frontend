import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Alert, Card, CardHeader, CardBody, Input, Label, Toast, ToastHeader, Tooltip } from 'reactstrap';
import { Info, Edit, Sparkles, AlertCircle } from 'lucide-react';
import { useAnalysis, useTrackEvaluation } from '../../contexts/AnalysisContext';

const AIResearchProblemSuggestion = ({ llmProblem, onUpdate, formatPercentage }) => {
  const trackEvaluation = useTrackEvaluation();
  const { dispatch } = useAnalysis();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(llmProblem?.title || '');
  const [editedDescription, setEditedDescription] = useState(llmProblem?.problem || '');
  const [showEditHint, setShowEditHint] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  // Store the original values for tracking
  const originalDataRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (llmProblem && Object.keys(llmProblem).length > 0) {
      setEditedTitle(llmProblem.title || '');
      setEditedDescription(llmProblem.problem || '');
      
      // Only store the original data once
      if (!isInitialized.current) {
        // Create deep copy of original problem
        const originalProblem = JSON.parse(JSON.stringify({
          title: llmProblem?.title || '',
          problem: llmProblem?.problem || '',
          confidence: llmProblem?.confidence,
          explanation: llmProblem?.explanation,
          domain: llmProblem?.domain,
          impact: llmProblem?.impact,
          motivation: llmProblem?.motivation,
          model: llmProblem?.model,
          timestamp: llmProblem?.timestamp
        }));

        // Store in ref for component use
        originalDataRef.current = originalProblem;
        
        // Also dispatch to store the original in state
        dispatch({ 
          type: 'SET_ORIGINAL_LLM_PROBLEM', 
          payload: originalProblem
        });
        
        isInitialized.current = true;
      }
      
      dispatch({ type: 'SET_RESEARCH_PROBLEMS_STATUS', payload: 'completed' });
      dispatch({ 
        type: 'UPDATE_LLM_PROBLEM', 
        payload: {
          ...llmProblem,
          title: llmProblem.title,
          description: llmProblem.problem,
          isLLMGenerated: true,
          lastEdited: new Date().toISOString()
        }
      });
    }
  }, [llmProblem, dispatch]);

  // Track initial LLM suggestion
  useEffect(() => {
    if (llmProblem && Object.keys(llmProblem).length > 0 && !isInitialized.current) {
      // Standardized tracking for initial research problem
      trackEvaluation('researchProblems', {
        type: 'initial_state',
        component: 'research_problem',
        original_data: {
          title: llmProblem.title,
          description: llmProblem.problem,
          confidence: llmProblem.confidence,
          explanation: llmProblem.explanation
        },
        new_data: null,
        changes: null,
        timestamp: new Date().toISOString()
      });
    }
  }, [llmProblem, trackEvaluation]);

  const handleInputChange = useCallback((field, value) => {
    const newTitle = field === 'title' ? value : editedTitle;
    const newDescription = field === 'description' ? value : editedDescription;

    setEditedTitle(newTitle);
    setEditedDescription(newDescription);
    
    // Update the edited version
    const updatedProblem = {
      ...llmProblem,
      title: newTitle,
      problem: newDescription,
      lastEdited: new Date().toISOString()
    };
    
    // Send to parent component
    onUpdate(updatedProblem);
    
    // Standardized tracking for field update
    trackEvaluation('researchProblems', {
      type: 'field_update',
      component: 'research_problem',
      field_name: field,
      original_data: { [field]: field === 'title' ? originalDataRef.current.title : originalDataRef.current.problem },
      new_data: { [field]: value },
      changes: {
        field: field,
        from: field === 'title' ? originalDataRef.current.title : originalDataRef.current.problem,
        to: value
      },
      timestamp: new Date().toISOString()
    });
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, [llmProblem, editedTitle, editedDescription, onUpdate, trackEvaluation]);

  const getFinalStateComparison = () => {
    if (!originalDataRef.current) return null;
    
    return {
      type: 'final_state_comparison',
      component: 'research_problem',
      original_data: originalDataRef.current,
      final_data: {
        title: editedTitle,
        problem: editedDescription,
        confidence: llmProblem?.confidence,
        explanation: llmProblem?.explanation
      },
      changes: {
        title_changed: originalDataRef.current.title !== editedTitle,
        description_changed: originalDataRef.current.problem !== editedDescription,
        title: {
          original: originalDataRef.current.title,
          final: editedTitle
        },
        description: {
          original: originalDataRef.current.problem,
          final: editedDescription
        }
      },
      timestamp: new Date().toISOString()
    };
  };

  const toggleTooltip = () => setTooltipOpen(!tooltipOpen);

  return (
    <div className="mt-4">
      {showEditHint && (
        <Alert color="info" className="d-flex align-items-center mb-3">
          <AlertCircle className="me-2" size={20} />
          <div>
            <h6 className="alert-heading mb-1">Pro tip!</h6>
            <p className="mb-0">
              You can edit both the title and description of the AI-generated research problem suggestion.
            </p>
            <Button size="sm" color="link" className="p-0" onClick={() => setShowEditHint(false)}>
              Got it
            </Button>
          </div>
        </Alert>
      )}

      <Toast isOpen={showToast} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1050 }}>
        <ToastHeader icon="success">
          The problem will be saved automatically to the ORKG when you click next
        </ToastHeader>
      </Toast>

      <Card className="border border-2">
        <CardHeader className="d-flex justify-content-between align-items-center bg-white">
          <div className="d-flex align-items-center">
            <Sparkles className="me-2 text-purple-500" size={20} />
            <h5 className="mb-0 text-purple-600">AI-Generated Research Problem Suggestion</h5>
          </div>
          <Button
            color="light"
            className="p-2 rounded-circle"
            onClick={() => setIsEditing(!isEditing)}
            title={isEditing ? "Finish editing" : "Edit research problem"}
          >
            <Edit size={16} className="text-muted" />
          </Button>
        </CardHeader>

        <CardBody className="pt-3">
          <div className="mb-3">
            <Label className="fw-medium mb-2 d-flex align-items-center">
              Title:
              {isEditing && <span className="ms-2 text-muted small">(Click to edit)</span>}
            </Label>
            <Input
              type="text"
              value={editedTitle}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter research problem title"
              className="mb-2"
            />
          </div>

          <div className="mb-3">
            <Label className="fw-medium mb-2 d-flex align-items-center">
              Description:
              {isEditing && <span className="ms-2 text-muted small">(Click to edit)</span>}
            </Label>
            <Input
              type="textarea"
              value={editedDescription}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter research problem description"
              className="mb-2"
              rows={4}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="fw-medium">Confidence:</span>
            <span className={
              llmProblem?.confidence >= 0.5 ? 'text-success fw-medium' : 'text-warning fw-medium'
            }>
              {formatPercentage(llmProblem?.confidence)}
            </span>
            {llmProblem?.explanation && (
              <>
                <Info 
                  size={16} 
                  className="text-muted cursor-pointer" 
                  id="confidence-explanation-tooltip" 
                />
                <Tooltip
                  isOpen={tooltipOpen}
                  target="confidence-explanation-tooltip"
                  toggle={toggleTooltip}
                  placement="right"
                >
                  <div className="text-muted mb-1 border-bottom pb-1">Confidence Score Explanation</div>
                  <div>{llmProblem?.explanation}</div>
                </Tooltip>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AIResearchProblemSuggestion;