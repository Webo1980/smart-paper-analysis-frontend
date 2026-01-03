import { env } from 'next-runtime-env';
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  FormGroup, 
  Label, 
  Input, 
  Alert,
  Badge,
  Collapse
} from 'reactstrap';
import { BookOpen, ExternalLink, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAnalysis, useTrackEvaluation } from '../../contexts/AnalysisContext';
import { LoadingSpinner } from '../../../common/LoadingSpinner';
import AutoTransition from '../../../common/AutoTransition';
import AITemplateCreation from './AITemplateCreation';
import ApiService from '../../../services/ApiService';
import { getLLMService } from '../../../services/GenericLLMService';

const formatPercentage = (value) => {
  if (!value && value !== 0) return '0.00%';
  return `${(value * 100).toFixed(2)}%`;
};

const TemplateViewer = () => {
  const trackEvaluation = useTrackEvaluation();
  const { state, dispatch } = useAnalysis();
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [openPapers, setOpenPapers] = useState({});
  const [generatingTemplate, setGeneratingTemplate] = useState(false);

  useEffect(() => {
    if (!isInitialLoading && state.templates?.available?.templates) {
      const templates = state.templates.available.templates;
      const firstTemplateKey = Object.keys(templates)[0];
      
      if (firstTemplateKey && !selectedTemplateId) {
        const firstTemplate = templates[firstTemplateKey].template;
        setSelectedTemplateId(firstTemplate.id);
        
        dispatch({
          type: 'SET_SELECTED_TEMPLATE',
          payload: {
            id: firstTemplate.id,
            templateId: `${firstTemplateKey}.template`,
            name: firstTemplate.name,
            template: firstTemplate
          }
        });
      }
    }
  }, [isInitialLoading, state.templates?.available?.templates]);

  // Track template detection in useEffect
  useEffect(() => {
    let isMounted = true;
  
    const detectTemplate = async () => {
      if (!state.researchFields?.selectedField || !state.researchProblems?.selectedProblem) {
        setIsInitialLoading(false);
        return;
      }
      
      if (state.templates?.llm_template) {
        setIsInitialLoading(false);
        return;
      }
  
      try {
        const apiService = ApiService.getInstance();
        
        if (state.researchProblems.orkg_problems?.length > 0) {
          const response = await apiService.detectTemplate(state.researchProblems.orkg_problems[0].id);
          
          if (response && isMounted) {
            // Check if we actually got templates or just empty response
            const hasTemplates = response.templates && Object.keys(response.templates).length > 0;
            
            if (hasTemplates) {
              // We have ORKG templates, use them
              dispatch({ type: 'SET_TEMPLATES', payload: response });
              dispatch({ type: 'COMPLETE_STEP', payload: 'template' });

              // Track template detection
              trackEvaluation('template', {
                detected_templates: response.templates,
                metadata: response.metadata,
                source: 'orkg_detection',
                status: 'completed',
                timestamp: new Date().toISOString()
              });
            } else {
              // No ORKG templates found, generate LLM template
              console.log('No ORKG templates found, generating LLM template...');
              await generateTemplate();
            }
          }
        } else if (state.researchProblems.llm_problem) {
          // No ORKG problems, directly generate LLM template
          await generateTemplate();
        }
      } catch (error) {
        if (isMounted) {
          console.error('Template detection error:', error);
          
          // On error, try to generate LLM template as fallback
          try {
            await generateTemplate();
          } catch (genError) {
            dispatch({ type: 'SET_ERROR', payload: genError.message || 'Failed to generate template' });
            
            // Track error
            trackEvaluation('template', {
              error: genError.message,
              source: 'llm_generation_fallback',
              status: 'error',
              timestamp: new Date().toISOString()
            });
          }
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };
  
    detectTemplate();
    return () => { isMounted = false; };
  }, [state.researchProblems?.selectedProblem, state.researchFields?.selectedField]);

  const togglePapers = (templateId) => {
    setOpenPapers(prev => ({
      ...prev,
      [templateId]: !prev[templateId]
    }));
  };

  const handleTemplateSelection = (templateName, template) => {
    setSelectedTemplateId(template.id);
    
    dispatch({
      type: 'SET_SELECTED_TEMPLATE',
      payload: {
        id: template.id,
        templateId: `${templateName}.template`,
        name: template.name,
        template: template
      }
    });

    // Track template selection
    trackEvaluation('template', {
      selected_template: {
        id: template.id,
        name: template.name,
        properties: template.properties
      },
      source: 'user_selection',
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  };

  const generateTemplate = async () => {
    if (!state.researchFields?.selectedField || !state.metadata?.abstract) {
      console.error('Missing required data for template generation');
     return;
   }
   
   setGeneratingTemplate(true);
   try {
     const llmService = getLLMService();
     
     // Use the research problem if available, otherwise extract from abstract
     let problemTitle = state.researchProblems?.llm_problem?.title || 
                       state.researchProblems?.selectedProblem?.title ||
                       'Research Problem';
     let problemDescription = state.researchProblems?.llm_problem?.problem || 
                             state.researchProblems?.selectedProblem?.description ||
                             state.metadata.abstract;

     const template = await llmService.generateResearchTemplate(
       state.researchFields.selectedField.name,
       problemTitle,
       problemDescription
     );

     dispatch({ 
       type: 'UPDATE_LLM_TEMPLATE', 
       payload: { template } 
     });
     
     dispatch({ 
       type: 'SET_TEMPLATE_STATUS', 
       payload: {
         status: 'completed',
         step: 'template',
         progress: 100,
         message: 'Template generated successfully',
         timestamp: new Date().toISOString()
       }
     });

     // Track LLM template generation
     trackEvaluation('template', {
       generated_template: template,
       source: 'llm_generation',
       research_field: state.researchFields.selectedField.name,
       status: 'completed',
       timestamp: new Date().toISOString()
     });

   } catch (error) {
     console.error('Error generating template:', error);
     dispatch({ 
       type: 'SET_ERROR', 
       payload: `Failed to generate template: ${error.message}` 
     });

     // Track generation error
     trackEvaluation('template', {
       error: error.message,
       source: 'llm_generation',
       research_field: state.researchFields.selectedField?.name,
       status: 'error',
       timestamp: new Date().toISOString()
     });

   } finally {
     setGeneratingTemplate(false);
   }
 };

 const renderHeader = () => (
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
       <BookOpen className="me-2" size={20} />
       Template Analysis
     </h5>
   </div>
 );

 const renderTemplateProperties = (properties) => (
   <div className="mt-3">
     <h6 className="mb-3">Properties:</h6>
     <div className="d-flex flex-column gap-3">
       {properties.map((prop) => (
         <div key={prop.id} className="border rounded p-3">
           <div className="d-flex align-items-center gap-2 mb-2">
             <span className="fw-medium">
               {prop.label}
               <a href={`${env('NEXT_PUBLIC_URL')}/property/${prop.id}`} target="_blank" rel="noopener noreferrer" className="text-primary d-inline-flex align-items-center gap-1 ms-2">
                 <ExternalLink size={14} />
               </a>
             </span>
             {prop.required && <Badge color="danger" pill>Required</Badge>}
             {prop.type && <Badge color="info" pill>{prop.type}</Badge>}
           </div>
           {prop.description && <p className="text-muted mb-0 small">{prop.description}</p>}
           {prop.source_section && (
             <div className="mt-2">
               <Badge color="secondary">Source: {prop.source_section}</Badge>
             </div>
           )}
         </div>
       ))}
     </div>
   </div>
 );

 const PaperPropertyBadge = ({ property }) => (
   <div className="inline-block px-2 py-1 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 mr-2 mb-2">
     {property.label}
   </div>
 );

 const PaperItem = ({ paper }) => {
   const properties = paper.template?.properties || [];
   return (
     <div className="border rounded p-3 mt-2">
       <div className="d-flex align-items-center justify-content-between mb-2">
         <h6 className="mb-0">{paper.title}</h6>
         <a href={`${env('NEXT_PUBLIC_URL')}/paper/${paper.id}`} target="_blank" rel="noopener noreferrer" className="text-primary d-flex align-items-center gap-1">
           <ExternalLink size={14} />
         </a>
       </div>
       <div className="d-flex flex-wrap mt-2">
         {properties.map(prop => <PaperPropertyBadge key={prop.id} property={prop} />)}
       </div>
     </div>
   );
 };

 const renderMetadataBadges = () => {
   const metadata = state.templates?.available?.metadata || {};
   return (
     <div>
       {metadata.total_papers_found && (
         <Badge color="info" className="me-2">Papers: {metadata.total_papers_found}</Badge>
       )}
       {metadata.research_field && (
         <Badge color="info">Field: {metadata.research_field}</Badge>
       )}
     </div>
   );
 };

 const renderTemplateList = () => {
   const templateData = state.templates?.available?.templates || {};

   return (
     <div className="d-flex flex-column gap-3">
       {Object.entries(templateData).map(([templateName, { template, papers }]) => {
         const isSelected = template.id === selectedTemplateId;
         const hasPapers = papers && papers.length > 0;

         return (
           <FormGroup key={template.id} className={`border rounded p-3 ${isSelected ? 'border-2 border-primary' : ''}`}>
             <div className="d-flex align-items-start">
               {state.analysisMode !== 'automatic' && (
                 <Input
                   type="radio"
                   name="template"
                   id={template.id}
                   value={template.id}
                   checked={isSelected}
                   onChange={() => handleTemplateSelection(templateName, template)}
                   className="me-3 mt-2"
                 />
               )}
               <div className="flex-grow-1">
                 <div>
                   <Label for={template.id} className="mb-0 fw-medium">
                     {template.name}
                     <a href={`${env('NEXT_PUBLIC_URL')}/template/${template.id}?isEditMode=true`} target="_blank" rel="noopener noreferrer" className="text-primary d-inline-flex align-items-center gap-1 ms-2">
                       <Edit2 size={14} />
                     </a>
                   </Label>
                   {isSelected && state.analysisMode === 'automatic' && (
                     <Badge color="success" pill className="ms-2">Selected</Badge>
                   )}
                 </div>
                 <div className="mb-4">
                   <div className="d-flex justify-content-between align-items-center">
                     <p className="text-muted mb-0"></p>
                     {renderMetadataBadges()}
                   </div>
                 </div>
                 {template.description && <p className="text-muted mt-2 mb-2">{template.description}</p>}
                 {template.properties && renderTemplateProperties(template.properties)}
                 {hasPapers && (
                   <div className="mt-4 border-top pt-3">
                     <div onClick={() => togglePapers(template.id)} style={{ cursor: 'pointer' }} className="d-flex align-items-center mb-2">
                       <h6 className="mb-0 me-2 d-flex align-items-center">
                         Related Papers
                         {openPapers[template.id] ? <ChevronUp size={16} className="ms-2" /> : <ChevronDown size={16} className="ms-2" />}
                       </h6>
                     </div>
                     <Collapse isOpen={openPapers[template.id]}>
                       <div className="mt-3">
                         {papers.slice(0, 5).map(paper => <PaperItem key={paper.id} paper={paper} />)}
                       </div>
                     </Collapse>
                   </div>
                 )}
               </div>
             </div>
           </FormGroup>
         );
       })}
     </div>
   );
 };

 if ((isInitialLoading || generatingTemplate) && !state.templates?.llm_template) {
   return (
     <div className="position-relative mt-5">
       {renderHeader()}
       <Card>
         <CardBody>
           <LoadingSpinner 
             color="#ff0000"
             size={64}
             text={[
               "Analyzing research problem and methodology...",
               "Searching for existing templates...",
               "Generating template structure...",
               "Creating domain-specific properties..."
             ]}
             textClassName="text-lg font-bold"
           />
         </CardBody>
       </Card>
     </div>
   );
 }

 const templateData = state.templates?.available?.templates || {};
 const hasTemplates = Object.keys(templateData).length > 0;

 return (
   <div className="position-relative mt-5">
     {renderHeader()}
     <Card>
       <CardBody>
         <div className="mb-4">
           <p className="text-muted mb-0">
             {state.analysisMode === 'automatic' ? "Auto-generated research template" : "Select research template"}
           </p>
         </div>
         {state.templates?.llm_template ? (
           <AITemplateCreation
             llmTemplate={state.templates.llm_template}
             onUpdate={(updatedTemplate) => dispatch({ type: 'UPDATE_LLM_TEMPLATE', payload: updatedTemplate })}
             formatPercentage={formatPercentage}
           />
         ) : hasTemplates ? (
           <div className="mb-4">
             {renderTemplateList()}
             {state.analysisMode === 'automatic' && <AutoTransition />}
           </div>
         ) : (
           <Alert color="info" className="mb-4">
             No templates were found in ORKG. A custom template has been generated for your paper.
           </Alert>
         )}
       </CardBody>
     </Card>
   </div>
 );
};

export default TemplateViewer;