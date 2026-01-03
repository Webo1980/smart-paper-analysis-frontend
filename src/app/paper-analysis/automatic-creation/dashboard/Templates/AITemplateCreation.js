// 1. AITemplateCreation Component
import React, { useState, useEffect, useRef } from 'react';
import { 
  Button,
  Alert, 
  Card, 
  CardHeader, 
  CardBody,
  Input,
  Label,
  Toast,
  ToastHeader,
  Badge,
  FormGroup,
  Col,
  Row
} from 'reactstrap';
import { Info, Edit, Sparkles, AlertCircle, Plus, Trash2, Check, X } from 'lucide-react';
import { useAnalysis, useTrackEvaluation } from '../../contexts/AnalysisContext';

const AITemplateCreation = ({ 
  llmTemplate, 
  onUpdate,
  formatPercentage 
}) => {
  const trackEvaluation = useTrackEvaluation();
  const { dispatch } = useAnalysis();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState(llmTemplate.template);
  const [showEditHint, setShowEditHint] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store the original template for comparison
  const originalDataRef = useRef(null);

  // Handle initial template setup
  useEffect(() => {
    if (!isInitialized && llmTemplate) {
      // Store deep copy of original template for comparison
      originalDataRef.current = JSON.parse(JSON.stringify(llmTemplate.template));
      
      dispatch({ type: 'SET_TEMPLATES', payload: llmTemplate });
      dispatch({ type: 'COMPLETE_STEP', payload: 'template' });

      // Track initial template state
      trackEvaluation('template', {
        type: 'initial_state',
        component: 'template',
        original_data: {
          name: llmTemplate.template.name,
          description: llmTemplate.template.description,
          properties: llmTemplate.template.properties.map(prop => ({...prop})),
          metadata: {...llmTemplate.template.metadata}
        },
        changes: null,
        timestamp: new Date().toISOString()
      });

      setIsInitialized(true);
    }
  }, [llmTemplate, isInitialized, dispatch, trackEvaluation]);

  useEffect(() => {
    setEditedTemplate(llmTemplate.template);
  }, [llmTemplate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEditHint(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const validateProperty = (property) => {
    const errors = {};
    if (!property.label?.trim()) {
      errors.label = 'Property name is required';
    }
    if (!property.description?.trim()) {
      errors.description = 'Description is required';
    }
    if (!property.type) {
      errors.type = 'Type is required';
    }
    return errors;
  };

  const handleTemplateChange = (field, value) => {
    const updatedTemplate = {
      ...editedTemplate,
      [field]: value
    };
    
    setEditedTemplate(updatedTemplate);
    handleUpdate(updatedTemplate);

    // Standardized tracking for template field changes
    trackEvaluation('template', {
      type: 'field_update',
      component: 'template',
      field_name: field,
      original_data: { [field]: originalDataRef.current[field] },
      new_data: { [field]: value },
      changes: {
        field: field,
        from: originalDataRef.current[field],
        to: value
      },
      timestamp: new Date().toISOString()
    });
  };

  const handlePropertyChange = (propertyId, field, value) => {
    const propertyIndex = editedTemplate.properties.findIndex(p => p.id === propertyId);
    if (propertyIndex === -1) return;
    
    // Find original property if it exists
    const originalProperty = originalDataRef.current.properties.find(p => p.id === propertyId);
    
    const updatedProperties = editedTemplate.properties.map(prop => 
      prop.id === propertyId ? { ...prop, [field]: value } : prop
    );

    const updatedTemplate = {
      ...editedTemplate,
      properties: updatedProperties
    };

    setEditedTemplate(updatedTemplate);
    handleUpdate(updatedTemplate);

    // Standardized tracking for property changes
    trackEvaluation('template', {
      type: 'property_update',
      component: 'template',
      property_id: propertyId,
      property_name: editedTemplate.properties[propertyIndex].label || 'Unnamed',
      field_name: field,
      original_data: originalProperty ? { [field]: originalProperty[field] } : null,
      new_data: { [field]: value },
      changes: {
        property: propertyId,
        field: field,
        from: originalProperty ? originalProperty[field] : null,
        to: value,
        is_new_property: !originalProperty
      },
      timestamp: new Date().toISOString()
    });
  };

  const handleAddProperty = () => {
    const newPropertyId = `prop-${crypto.randomUUID().slice(0, 8)}`;
    const newProperty = {
      id: newPropertyId,
      label: '',
      description: '',
      type: 'text',
      required: true,
      value: null,
      confidence: null,
      evidence: null,
      source_section: null
    };

    const updatedTemplate = {
      ...editedTemplate,
      properties: [...editedTemplate.properties, newProperty],
      metadata: {
        ...editedTemplate.metadata,
        total_properties: editedTemplate.properties.length + 1
      }
    };

    setEditedTemplate(updatedTemplate);
    handleUpdate(updatedTemplate);

    // Standardized tracking for property addition
    trackEvaluation('template', {
      type: 'property_added',
      component: 'template',
      property_id: newPropertyId,
      original_data: null,
      new_data: newProperty,
      changes: {
        action: 'added',
        property_id: newPropertyId,
        previous_count: editedTemplate.properties.length,
        new_count: updatedTemplate.properties.length
      },
      timestamp: new Date().toISOString()
    });
  };

  const handleDeleteProperty = (propertyId) => {
    // Get the property being deleted before filtering
    const propertyIndex = editedTemplate.properties.findIndex(p => p.id === propertyId);
    if (propertyIndex === -1) return;
    
    const deletedProperty = editedTemplate.properties[propertyIndex];
    const originalProperty = originalDataRef.current.properties.find(p => p.id === propertyId);
    
    const updatedProperties = editedTemplate.properties.filter(prop => prop.id !== propertyId);
    
    const updatedTemplate = {
      ...editedTemplate,
      properties: updatedProperties,
      metadata: {
        ...editedTemplate.metadata,
        total_properties: updatedProperties.length
      }
    };
  
    setEditedTemplate(updatedTemplate);
    handleUpdate(updatedTemplate);
    
    // Standardized tracking for property deletion
    trackEvaluation('template', {
      type: 'property_deleted',
      component: 'template',
      property_id: propertyId,
      original_data: originalProperty || null,
      new_data: null,
      changes: {
        action: 'deleted',
        property: {
          id: propertyId,
          label: deletedProperty.label,
          description: deletedProperty.description,
          type: deletedProperty.type,
          required: deletedProperty.required
        },
        was_original: !!originalProperty,
        previous_count: editedTemplate.properties.length,
        new_count: updatedProperties.length
      },
      timestamp: new Date().toISOString()
    });
  
    setShowDeleteConfirm(null);
  };

  const getFinalStateComparison = () => {
    // This function can be called when submitting the final template
    // to get a comprehensive comparison of original vs. final state
    const propertiesAdded = editedTemplate.properties.filter(p => 
      !originalDataRef.current.properties.some(op => op.id === p.id)
    );
    
    const propertiesDeleted = originalDataRef.current.properties.filter(p => 
      !editedTemplate.properties.some(ep => ep.id === p.id)
    );
    
    const propertiesModified = editedTemplate.properties.filter(p => {
      const originalProp = originalDataRef.current.properties.find(op => op.id === p.id);
      if (!originalProp) return false;
      return (
        originalProp.label !== p.label ||
        originalProp.description !== p.description ||
        originalProp.required !== p.required ||
        originalProp.type !== p.type
      );
    });

    return {
      type: 'final_state_comparison',
      component: 'template',
      original_data: originalDataRef.current,
      final_data: editedTemplate,
      changes: {
        title_changed: originalDataRef.current.name !== editedTemplate.name,
        description_changed: originalDataRef.current.description !== editedTemplate.description,
        properties_added: propertiesAdded.length,
        properties_deleted: propertiesDeleted.length,
        properties_modified: propertiesModified.length,
        added_properties: propertiesAdded,
        deleted_properties: propertiesDeleted,
        modified_properties: propertiesModified
      },
      timestamp: new Date().toISOString()
    };
  };

  const handleUpdate = (updatedTemplate) => {
    onUpdate({
      ...llmTemplate,
      template: updatedTemplate
    });
    showToastMessage('Changes saved');
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Rest of the component code remains the same
  const renderPropertyCard = (property) => (
    <div key={property.id} className="border rounded p-3 mb-3">
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Label className="fw-medium mb-0">Property Details</Label>
          <div className="d-flex gap-2 align-items-center">
            {property.required && <Badge color="danger" pill>Required</Badge>}
            <Badge color="info" pill>{property.type}</Badge>
            <Button
              color="danger"
              size="sm"
              className="p-1"
              onClick={() => setShowDeleteConfirm(property.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        {showDeleteConfirm === property.id && (
          <Alert color="danger" className="mt-2">
            <div className="d-flex justify-content-between align-items-center">
              <span>Delete this property?</span>
              <div>
                <Button color="danger" size="sm" className="me-2" onClick={() => handleDeleteProperty(property.id)}>
                  <Check size={16} />
                </Button>
                <Button color="secondary" size="sm" onClick={() => setShowDeleteConfirm(null)}>
                  <X size={16} />
                </Button>
              </div>
            </div>
          </Alert>
        )}
        
        <FormGroup>
          <Label className="small text-muted">Name</Label>
          <Input
            type="text"
            value={property.label || ''}
            onChange={(e) => handlePropertyChange(property.id, 'label', e.target.value)}
            className={`mb-2 ${validationErrors[property.id]?.label ? 'is-invalid' : ''}`}
            placeholder="Enter property name"
          />
          {validationErrors[property.id]?.label && (
            <div className="invalid-feedback">{validationErrors[property.id].label}</div>
          )}
        </FormGroup>

        <FormGroup>
          <Label className="small text-muted">Description</Label>
          <Input
            type="textarea"
            value={property.description || ''}
            onChange={(e) => handlePropertyChange(property.id, 'description', e.target.value)}
            className={`mb-2 ${validationErrors[property.id]?.description ? 'is-invalid' : ''}`}
            rows={3}
            placeholder="Describe what this property captures"
          />
        </FormGroup>

        <Row>
          <Col>
            <FormGroup>
              <Label className="small text-muted">Required</Label>
              <Input
                type="select"
                value={property.required.toString()}
                onChange={(e) => handlePropertyChange(property.id, 'required', e.target.value === 'true')}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Input>
            </FormGroup>
          </Col>
        </Row>
      </div>
    </div>
  );

  return (
    <div className="mt-4">
      {showEditHint && (
        <Alert color="info" className="d-flex align-items-center mb-3">
          <AlertCircle className="me-2" size={20} />
          <div>
            <h6 className="alert-heading mb-1">Template Generation Guide</h6>
            <p className="mb-0">This template has been generated based on the research problem analysis. You can customize it to better fit your needs.</p>
          </div>
        </Alert>
      )}

      <Toast isOpen={showToast} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1050 }}>
        <ToastHeader icon="success">{toastMessage}</ToastHeader>
      </Toast>

      <Card className="border border-2">
        <CardHeader className="d-flex justify-content-between align-items-center bg-white">
          <div className="d-flex align-items-center">
            <Sparkles className="me-2 text-purple-500" size={20} />
            <h5 className="mb-0 text-purple-600">Research Template</h5>
          </div>
          <Button
            color="light"
            className="p-2"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit size={16} className="text-muted" />
          </Button>
        </CardHeader>

        <CardBody>
          <div className="mb-4">
            <FormGroup>
              <Label className="fw-medium">Template Name</Label>
              <Input
                type="text"
                value={editedTemplate.name}
                onChange={(e) => handleTemplateChange('name', e.target.value)}
                className="mb-2"
              />
            </FormGroup>

            <FormGroup>
              <Label className="fw-medium">Description</Label>
              <Input
                type="textarea"
                value={editedTemplate.description}
                onChange={(e) => handleTemplateChange('description', e.target.value)}
                rows={3}
              />
            </FormGroup>
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Label className="fw-medium mb-0">Properties</Label>
              <Button color="primary" size="sm" onClick={handleAddProperty}>
                <Plus size={16} className="me-1" />
                Add Property
              </Button>
            </div>
            {editedTemplate.properties.map(renderPropertyCard)}
          </div>

          <div className="d-flex align-items-center gap-2">
            <Info size={16} className="text-muted" />
            <span className="text-muted small">
              Total Properties: {editedTemplate.properties.length}
            </span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AITemplateCreation;