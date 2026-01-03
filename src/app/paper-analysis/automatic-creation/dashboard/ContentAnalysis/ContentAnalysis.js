import React, { useState, useEffect, useRef } from 'react';
import './tooltips.css';
import { FileText, AlertCircle } from 'lucide-react';
import { Card, CardBody, Alert } from 'reactstrap';
import RAGService from '../../../services/RAGService';
import ApiService from '../../../services/ApiService';
import { useAnalysis, useTrackEvaluation } from '../../contexts/AnalysisContext';
import { LoadingSpinner } from '../../../common/LoadingSpinner';
import PropertyTable from './PropertyTable';

const ContentAnalysis = () => {
  const trackEvaluation = useTrackEvaluation();
  const { state, dispatch } = useAnalysis();
  const [sections, setSections] = useState({});
  const [analysis, setAnalysis] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHint, setShowHint] = useState(true);
  
  // Store the original analysis to compare against changes
  const originalDataRef = useRef(null);

  // Helper function to parse LLM response
  const parseLLMResponse = (response) => {
    // If response is already a parsed object, return it
    if (typeof response === 'object' && response !== null) {
      return response;
    }
    
    // If response is a string, try to parse it as JSON
    if (typeof response === 'string') {
      try {
        // Try to find JSON in the string if it's wrapped in markdown code blocks
        let jsonString = response.trim();
        
        // Remove markdown code blocks if present
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('Failed to parse LLM response as JSON:', error);
        console.log('Raw response:', response);
        
        // If JSON parsing fails, try to extract key-value pairs
        return extractKeyValuePairs(response);
      }
    }
    
    return {};
  };

  // Fallback function to extract key-value pairs from text
  const extractKeyValuePairs = (text) => {
    const result = {};
    const lines = text.split('\n');
    
    lines.forEach(line => {
      // Look for patterns like "key": "value" or "key": value
      const match = line.match(/"([^"]+)":\s*("[^"]*"|[^,}\s]+)/);
      if (match) {
        const key = match[1];
        let value = match[2];
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        result[key] = value;
      }
    });
    
    return result;
  };

  // Helper function to determine data type
const getDataType = (value) => {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    // Try to detect specific string types
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (value.startsWith('http://') || value.startsWith('https://')) return 'url';
    if (value.includes('@') && value.includes('.')) return 'email';
    if (/^-?\d+(\.\d+)?$/.test(value)) return 'number';
    return 'text';
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'text';
};

  // Enhanced helper function to normalize complex analysis results
const normalizeAnalysisResults = (results) => {
  const normalized = {};
  
  // If results is already in the expected format, return as-is
  if (results.values !== undefined || (typeof results === 'object' && !Array.isArray(results))) {
    // Check if this is already normalized (has the structure we expect)
    const firstKey = Object.keys(results)[0];
    if (firstKey && results[firstKey]?.values !== undefined) {
      return results;
    }
  }
  
  // Function to recursively flatten nested objects with better handling
  const flattenObject = (obj, prefix = '', path = '', depth = 0) => {
    const flattened = {};
    
    // Prevent infinite recursion and handle depth
    if (depth > 10) {
      console.warn('Maximum depth reached during flattening:', path);
      return flattened;
    }
    
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}_${key}` : key;
      const newPath = path ? `${path}.${key}` : key;
      
      if (value === null || value === undefined) {
        // Handle null/undefined values
        flattened[newKey] = {
          value: '',
          metadata: {
            property_type: 'text',
            path: newPath,
            is_null: true
          },
          values: [{
            value: '',
            confidence: 1,
            evidence: {},
            id: `val-${Math.random().toString(36).substring(2, 9)}`
          }]
        };
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Check if this is a simple key-value object that should be flattened
        const isSimpleObject = Object.keys(value).every(k => {
          const val = value[k];
          return val === null || val === undefined || 
                 typeof val === 'string' || 
                 typeof val === 'number' || 
                 typeof val === 'boolean';
        });
        
        if (isSimpleObject && Object.keys(value).length > 0) {
          // Flatten simple objects into individual properties
          Object.entries(value).forEach(([subKey, subValue]) => {
            const finalKey = `${newKey}_${subKey}`;
            const finalPath = `${newPath}.${subKey}`;
            
            flattened[finalKey] = {
              value: String(subValue ?? ''),
              metadata: {
                property_type: getDataType(subValue),
                path: finalPath,
                parent_key: newKey
              },
              values: [{
                value: String(subValue ?? ''),
                confidence: 1,
                evidence: {},
                id: `val-${Math.random().toString(36).substring(2, 9)}`
              }]
            };
          });
        } else if (Object.keys(value).length === 0) {
          // Handle empty objects
          flattened[newKey] = {
            value: '[Empty Object]',
            metadata: {
              property_type: 'text',
              path: newPath,
              is_empty: true
            },
            values: [{
              value: '[Empty Object]',
              confidence: 1,
              evidence: {},
              id: `val-${Math.random().toString(36).substring(2, 9)}`
            }]
          };
        } else {
          // Recursively flatten complex nested objects
          const nested = flattenObject(value, newKey, newPath, depth + 1);
          Object.assign(flattened, nested);
        }
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          // Handle empty arrays
          flattened[newKey] = {
            value: '[]',
            metadata: {
              property_type: 'text',
              path: newPath,
              is_array: true,
              is_empty: true
            },
            values: [{
              value: '[]',
              confidence: 1,
              evidence: {},
              id: `val-${Math.random().toString(36).substring(2, 9)}`
            }]
          };
        } else if (value.every(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
          // Handle arrays of primitives
          flattened[newKey] = {
            value: value.join(', '),
            metadata: {
              property_type: 'text',
              path: newPath,
              is_array: true,
              item_count: value.length,
              original_value: value
            },
            values: [{
              value: value.join(', '),
              confidence: 1,
              evidence: {},
              id: `val-${Math.random().toString(36).substring(2, 9)}`
            }]
          };
        } else {
          // Handle arrays of objects - create summary and individual properties
          const summary = value.map((item, index) => {
            if (typeof item === 'object' && item !== null) {
              // Try to extract a meaningful summary
              if (item.name) return item.name;
              if (item.id) return item.id;
              if (item.value) return item.value;
              return `Item ${index + 1}`;
            }
            return String(item);
          }).join(', ');
          
          flattened[newKey] = {
            value: `[${summary}]`,
            metadata: {
              property_type: 'text',
              path: newPath,
              is_array: true,
              item_count: value.length,
              contains_objects: true
            },
            values: [{
              value: `[${summary}]`,
              confidence: 1,
              evidence: {},
              id: `val-${Math.random().toString(36).substring(2, 9)}`
            }]
          };
          
          // Also create individual properties for each array item
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              const itemFlattened = flattenObject(item, `${newKey}_${index + 1}`, `${newPath}[${index}]`, depth + 1);
              Object.assign(flattened, itemFlattened);
            } else {
              const itemKey = `${newKey}_${index + 1}`;
              flattened[itemKey] = {
                value: String(item),
                metadata: {
                  property_type: getDataType(item),
                  path: `${newPath}[${index}]`,
                  array_index: index,
                  parent_key: newKey
                },
                values: [{
                  value: String(item),
                  confidence: 1,
                  evidence: {},
                  id: `val-${Math.random().toString(36).substring(2, 9)}`
                }]
              };
            }
          });
        }
      } else {
        // Handle primitive values
        flattened[newKey] = {
          value: String(value ?? ''),
          metadata: {
            property_type: getDataType(value),
            path: newPath
          },
          values: [{
            value: String(value ?? ''),
            confidence: 1,
            evidence: {},
            id: `val-${Math.random().toString(36).substring(2, 9)}`
          }]
        };
      }
    });
    
    return flattened;
  };
  
  // Flatten the entire results object
  const flattened = flattenObject(results);
  
  // Convert to the expected format with labels and ensure proper structure
  Object.entries(flattened).forEach(([key, value]) => {
    // Generate a human-readable label
    const label = key.split('_')
      .map(word => {
        // Handle special cases and acronyms
        if (word.toLowerCase() === 'ai') return 'AI';
        if (word.toLowerCase() === 'ct') return 'CT';
        if (word.toLowerCase() === 'roi') return 'ROI';
        if (word.toLowerCase() === 'auc') return 'AUC';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ')
      .replace(/(\d+)/g, ' $1 ') // Add spaces around numbers
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
    
    normalized[key] = {
      property: key,
      label: label,
      type: value.metadata?.property_type || 'text',
      metadata: value.metadata || {},
      values: value.values || [{
        value: value.value || '',
        confidence: 1,
        evidence: {},
        id: `val-${Math.random().toString(36).substring(2, 9)}`
      }]
    };
    
    // Ensure values array is properly formatted
    if (!normalized[key].values || !Array.isArray(normalized[key].values)) {
      normalized[key].values = [{
        value: normalized[key].value || '',
        confidence: 1,
        evidence: {},
        id: `val-${Math.random().toString(36).substring(2, 9)}`
      }];
    }
  });
  
  console.log('Flattened properties:', Object.keys(flattened));
  console.log('Normalized analysis:', normalized);
  
  return normalized;
};

  // Enhanced change detection to track specific types of changes
  const detectChanges = (oldAnalysis, newAnalysis) => {
    const changes = {
      text_updates: [],
      type_updates: [],
      deletions: [],
      additions: [],
      property_modifications: {}
    };

    // First identify property-level changes
    Object.keys({...oldAnalysis, ...newAnalysis}).forEach(propertyKey => {
      const oldProperty = oldAnalysis[propertyKey];
      const newProperty = newAnalysis[propertyKey];
      
      // Handle property no longer exists
      if (!newProperty) {
        changes.deletions.push({
          type: 'property_deleted',
          property_key: propertyKey,
          deleted_property: oldProperty
        });
        return;
      }
      
      // Handle new property
      if (!oldProperty) {
        changes.additions.push({
          type: 'property_added',
          property_key: propertyKey,
          added_property: newProperty
        });
        return;
      }
      
      // Track property type changes
      const oldType = oldProperty.metadata?.property_type;
      const newType = newProperty.metadata?.property_type;
      if (oldType !== newType) {
        changes.type_updates.push({
          type: 'property_type_changed',
          property_key: propertyKey,
          old_type: oldType,
          new_type: newType
        });
      }
      
      // Create maps of values by ID for easy comparison
      const oldValuesMap = {};
      const newValuesMap = {};
      
      oldProperty.values.forEach(val => {
        if (val.id) oldValuesMap[val.id] = val;
      });
      
      newProperty.values.forEach(val => {
        if (val.id) newValuesMap[val.id] = val;
      });
      
      // Check for deleted values
      Object.keys(oldValuesMap).forEach(valId => {
        if (!newValuesMap[valId]) {
          changes.deletions.push({
            type: 'value_deleted',
            property_key: propertyKey,
            value_id: valId,
            deleted_value: oldValuesMap[valId]
          });
        }
      });
      
      // Check for added values
      Object.keys(newValuesMap).forEach(valId => {
        if (!oldValuesMap[valId]) {
          changes.additions.push({
            type: 'value_added',
            property_key: propertyKey,
            value_id: valId,
            added_value: newValuesMap[valId]
          });
        }
      });
      
      // Check for updated values
      Object.keys(newValuesMap).forEach(valId => {
        if (oldValuesMap[valId]) {
          const oldVal = oldValuesMap[valId];
          const newVal = newValuesMap[valId];
          
          // Text content changed
          if (oldVal.value !== newVal.value) {
            changes.text_updates.push({
              type: 'text_updated',
              property_key: propertyKey,
              value_id: valId,
              old_value: oldVal.value,
              new_value: newVal.value
            });
          }
          
          // Type changed (if tracking at value level)
          if (oldVal.value_type !== newVal.value_type) {
            changes.type_updates.push({
              type: 'value_type_changed',
              property_key: propertyKey,
              value_id: valId,
              old_type: oldVal.value_type,
              new_type: newVal.value_type
            });
          }
        }
      });
      
      // Store property-level change summaries
      if (
        changes.text_updates.some(u => u.property_key === propertyKey) ||
        changes.type_updates.some(u => u.property_key === propertyKey) ||
        changes.additions.some(u => u.property_key === propertyKey) ||
        changes.deletions.some(u => u.property_key === propertyKey)
      ) {
        changes.property_modifications[propertyKey] = {
          old_values: oldProperty.values,
          new_values: newProperty.values,
          old_type: oldProperty.metadata?.property_type,
          new_type: newProperty.metadata?.property_type
        };
      }
    });
    
    return changes;
  };

  // Legacy function maintained for backward compatibility
  const findModifiedProperties = (oldAnalysis, newAnalysis) => {
    const modifications = {};
    Object.keys({...oldAnalysis, ...newAnalysis}).forEach(key => {
      const oldValues = oldAnalysis[key]?.values || [];
      const newValues = newAnalysis[key]?.values || [];
      
      if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) {
        modifications[key] = {
          old_values: oldValues,
          new_values: newValues,
          old_type: oldAnalysis[key]?.metadata?.property_type,
          new_type: newAnalysis[key]?.metadata?.property_type
        };
      }
    });
    return modifications;
  };

  useEffect(() => {
    const fetchAndAnalyze = async () => {
      if (!state?.metadata?.url) {
        setError('No paper URL provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const apiService = ApiService.getInstance();
        const parsedContent = await apiService.parseArticle(state.metadata.url);
        
        if (!parsedContent?.text_sections) {
          throw new Error('No sections found in parsed content');
        }

        setSections(parsedContent.text_sections);
        
        const template = state?.templates?.llm_template?.template || 
                        state?.templates?.selectedTemplate;
        
        if (!template) {
          throw new Error('No template selected');
        }
        
        const results = await RAGService.getInstance().analyzePaperSections(
          parsedContent.text_sections,
          template,
          false
        );

        if (!results || typeof results !== 'object') {
          throw new Error('Invalid analysis results');
        }

        // Parse the LLM response to handle JSON strings
        const parsedResults = parseLLMResponse(results);
        
        // Normalize the results to our expected format
        const normalizedResults = normalizeAnalysisResults(parsedResults);
        
        console.log('Normalized results:', normalizedResults); // Debug log
        
        // Store original analysis for change tracking
        originalDataRef.current = JSON.parse(JSON.stringify(normalizedResults));
        
        setAnalysis(normalizedResults);
        
        dispatch({ 
          type: 'COMPLETE_STEP', 
          payload: 'paperContent' 
        });

        // Standardized tracking for initial analysis
        trackEvaluation('paperContent', {
          type: 'initial_state',
          component: 'content_analysis',
          original_data: normalizedResults,
          new_data: null,
          changes: null,
          metadata: {
            template_id: template.id,
            template_name: template.name,
            sections_analyzed: Object.keys(parsedContent.text_sections).length,
            properties_extracted: Object.keys(normalizedResults).length
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (err) {
        setError(err.message);
        console.error('Analysis error:', err);

        // Standardized tracking for error
        trackEvaluation('paperContent', {
          type: 'error',
          component: 'content_analysis',
          error: err.message,
          timestamp: new Date().toISOString()
        });

      } finally {
        setLoading(false);
      }
    };
    
    fetchAndAnalyze();
  }, [state?.templates?.selectedTemplate, state?.templates?.llm_template, state.metadata.url, dispatch]);
  
  useEffect(() => {
    // Only update if analysis has been initialized and contains properties
    if (Object.keys(analysis).length > 0) {
      // Check if we have meaningful values (more strict validation)
      const hasValidContent = Object.values(analysis).some(prop => 
        prop?.values?.some(v => v.value && v.value.trim() !== '')
      );
      
      if (hasValidContent) {
        // Ensure we're sending properly structured data
        const sanitizedAnalysis = {};
        
        Object.entries(analysis).forEach(([key, value]) => {
          // Only include properties with valid values
          if (value?.values?.some(v => v.value && v.value.trim() !== '')) {
            sanitizedAnalysis[key] = {
              ...value,
              // Ensure all required fields exist and have valid format
              property: value.property || key,
              label: value.label || key, 
              type: value.type || 'text',
              values: value.values.filter(v => v.value && v.value.trim() !== '')
            };
          }
        });
        
        dispatch({
          type: 'UPDATE_PAPER_CONTENT',
          payload: {
            paperContent: sanitizedAnalysis,
            text_sections: sections,
            status: 'completed'
          }
        });
      }
    }
  }, [analysis, sections, dispatch]);

  const handleAnalysisUpdate = (updatedAnalysis) => {
    const normalizedAnalysis = normalizeAnalysisResults(updatedAnalysis);
    
    // Detect detailed changes between previous and current states
    const changes = detectChanges(analysis, normalizedAnalysis);
    
    // Legacy modifications for backward compatibility
    const modifiedProperties = findModifiedProperties(analysis, normalizedAnalysis);
    
    setAnalysis(normalizedAnalysis);
    
    dispatch({ 
      type: 'UPDATE_ANALYSIS', 
      payload: normalizedAnalysis 
    });

    // Track all changes in detail with standardized format
    if (changes.text_updates.length > 0) {
      trackEvaluation('paperContent', {
        type: 'text_update',
        component: 'content_analysis',
        original_data: changes.text_updates.map(update => ({
          property_key: update.property_key,
          value_id: update.value_id,
          value: update.old_value
        })),
        new_data: changes.text_updates.map(update => ({
          property_key: update.property_key,
          value_id: update.value_id,
          value: update.new_value
        })),
        changes: changes.text_updates,
        timestamp: new Date().toISOString()
      });
    }
    
    if (changes.type_updates.length > 0) {
      trackEvaluation('paperContent', {
        type: 'type_update',
        component: 'content_analysis',
        original_data: changes.type_updates.map(update => ({
          property_key: update.property_key,
          value_id: update.value_id,
          type: update.old_type
        })),
        new_data: changes.type_updates.map(update => ({
          property_key: update.property_key,
          value_id: update.value_id,
          type: update.new_type
        })),
        changes: changes.type_updates,
        timestamp: new Date().toISOString()
      });
    }
    
    if (changes.deletions.length > 0) {
      trackEvaluation('paperContent', {
        type: 'value_deletion',
        component: 'content_analysis',
        original_data: changes.deletions.map(del => ({
          property_key: del.property_key,
          value_id: del.value_id,
          value: del.deleted_value
        })),
        new_data: null,
        changes: changes.deletions,
        timestamp: new Date().toISOString()
      });
    }
    
    if (changes.additions.length > 0) {
      trackEvaluation('paperContent', {
        type: 'value_addition',
        component: 'content_analysis',
        original_data: null,
        new_data: changes.additions.map(add => ({
          property_key: add.property_key,
          value_id: add.value_id,
          value: add.added_value
        })),
        changes: changes.additions,
        timestamp: new Date().toISOString()
      });
    }
    
    // Also track a summary of all changes for convenience
    trackEvaluation('paperContent', {
      type: 'update_summary',
      component: 'content_analysis',
      original_data: analysis,
      new_data: normalizedAnalysis,
      changes: {
        modified_properties: modifiedProperties,
        changes_summary: {
          text_updates: changes.text_updates.length,
          type_updates: changes.type_updates.length,
          deletions: changes.deletions.length,
          additions: changes.additions.length
        }
      },
      timestamp: new Date().toISOString()
    });
  };

  // Generate a final comparison between original and current state
  const getFinalStateComparison = () => {
    if (!originalDataRef.current) return null;
    
    const changes = detectChanges(originalDataRef.current, analysis);
    
    return {
      type: 'final_state_comparison',
      component: 'content_analysis',
      original_data: originalDataRef.current,
      final_data: analysis,
      changes: {
        summary: {
          properties_added: Object.keys(analysis).filter(key => !originalDataRef.current[key]).length,
          properties_removed: Object.keys(originalDataRef.current).filter(key => !analysis[key]).length,
          text_updates: changes.text_updates.length,
          type_updates: changes.type_updates.length,
          value_additions: changes.additions.filter(a => a.type === 'value_added').length,
          value_deletions: changes.deletions.filter(d => d.type === 'value_deleted').length
        },
        details: changes
      },
      timestamp: new Date().toISOString()
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <LoadingSpinner
          color="#e86161"
          size={64}
          text={[
            "Analyzing paper content...",
            "Extracting key properties...",
            "Processing document sections...",
            "Generating structured insights...",
            "Finalizing analysis..."
          ]}
          textClassName="text-lg fw-medium text-muted"
        />
      );
    }
    
    if (error) {
      return (
        <Alert color="danger">
          {error}
        </Alert>
      );
    }

    if (!analysis || Object.keys(analysis).length === 0) {
      return (
        <Alert color="warning">
          No analysis results available
        </Alert>
      );
    }

    return (
      <>
        {showHint && (
          <Alert color="info" className="d-flex align-items-center mb-4">
            <AlertCircle className="me-2" size={20} />
            <div>
              <h6 className="alert-heading mb-1">Editing Properties</h6>
              <p className="mb-0">
                You can edit any property value by clicking the edit button. 
                Select the appropriate data type from the dropdown menu for each value.
                Add multiple values using the "Add Value" button. Hover over the info 
                icons to see property descriptions and evidence from the paper.
              </p>
            </div>
          </Alert>
        )}
        <PropertyTable 
          analysis={analysis} 
          onUpdate={handleAnalysisUpdate}
        />
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
        <h5 className="mb-0 text-white d-flex align-items-center gap-2" style={{ fontSize: '16px', fontWeight: '500' }}>
          <FileText size={20} />
          Paper Content Analysis
        </h5>
      </div>
      <Card>
        <CardBody className="p-4">
          {renderContent()}
        </CardBody>
      </Card>
    </div>
  );
};

export default ContentAnalysis;