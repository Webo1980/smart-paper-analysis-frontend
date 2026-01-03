import React, { useState, useMemo } from 'react';
import { Info, Plus } from 'lucide-react';
import { Button, Tooltip } from 'reactstrap';
import EditableValue from './EditableValue';
import { useAnalysis } from '../../contexts/AnalysisContext';

const PropertyInfoTooltip = ({ target, property, templateProperty, isOpen, toggle }) => (
  <Tooltip 
    target={target} 
    isOpen={isOpen} 
    toggle={toggle}
    style={{
      maxWidth: '300px',
      maxHeight: '200px'
    }}
  >
    <div 
      className="text-start custom-tooltip-content" 
      style={{ 
        maxHeight: '180px',
        overflowY: 'auto',
        paddingRight: '10px'
      }}
    >
      <div className="fw-medium mb-1">Description:</div>
      <div className="text-muted">
        {templateProperty?.description || 'No description available'}
      </div>
      {templateProperty?.type && (
        <div className="mt-2">
          <strong>Expected Type:</strong> {templateProperty.type}
        </div>
      )}
      {property.metadata?.constraints && (
        <div className="mt-2">
          <strong>Constraints:</strong>
          <div className="text-muted small">
            {property.metadata.constraints}
          </div>
        </div>
      )}
      {property.metadata?.path && (
        <div className="mt-2">
          <strong>Source Path:</strong>
          <div className="text-muted small">
            {property.metadata.path}
          </div>
        </div>
      )}
    </div>
  </Tooltip>
);

const PropertyTable = ({ analysis, onUpdate }) => {
  const [newValueIndices, setNewValueIndices] = useState({});
  const [tooltipStates, setTooltipStates] = useState({});
  const { state } = useAnalysis();

  const toggleTooltip = (propertyId) => {
    setTooltipStates(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId]
    }));
  };

  const normalizePropertyValue = (propertyData) => {
    if (!propertyData) return [];
    
    // Handle the normalized format
    if (propertyData.values && Array.isArray(propertyData.values)) {
      return propertyData.values.map(v => ({
        value: v.value,
        confidence: v.confidence || 1,
        evidence: v.evidence || {},
        id: v.id || `val-${Math.random().toString(36).substring(2, 9)}`
      }));
    }
    
    // Handle legacy format
    return [{
      value: propertyData.value || '',
      confidence: propertyData.confidence || 1,
      evidence: propertyData.evidence || {},
      id: `val-${Math.random().toString(36).substring(2, 9)}`
    }];
  };

  const groupedProperties = useMemo(() => {
    const groups = {};
    Object.entries(analysis).forEach(([key, value]) => {
      // Use the first part of the key for grouping (before any numbers)
      const prefix = key.split(/\d+/)[0];
      if (!groups[prefix]) groups[prefix] = [];
      
      // Ensure we have a properly formatted property object
      const normalizedValues = normalizePropertyValue(value);
      groups[prefix].push({ 
        id: key, 
        label: value.label || key,
        metadata: value.metadata || {},
        type: value.type || '',
        normalizedValues,
        ...value
      });
    });
    return groups;
  }, [analysis]);

  const getTemplateProperty = (propertyId) => {
    const templateProps = state.templates?.llm_template?.template?.properties || [];
    return templateProps.find(p => p.id === propertyId);
  };

  const updatePropertyValue = (propertyId, newValue, newType, valueIndex = null) => {
    const updatedAnalysis = { ...analysis };
    const property = { ...updatedAnalysis[propertyId] };
    const currentValues = normalizePropertyValue(property);

    if (valueIndex !== null) {
      // Update existing value
      if (currentValues[valueIndex]) {
        currentValues[valueIndex] = {
          ...currentValues[valueIndex],
          value: newValue,
          confidence: currentValues[valueIndex].confidence || 1
        };
      } else {
        currentValues[valueIndex] = {
          value: newValue,
          confidence: 1,
          evidence: {}
        };
      }
    } else {
      // Add new value
      currentValues.push({
        value: newValue,
        confidence: 1,
        evidence: {}
      });
    }

    // Update property with new values array
    property.values = currentValues;

    if (newType) {
      if (!property.metadata) property.metadata = {};
      property.metadata.property_type = newType;
    }

    updatedAnalysis[propertyId] = property;
    onUpdate(updatedAnalysis);
  };

  const addValueToProperty = (propertyId) => {
    const updatedAnalysis = { ...analysis };
    const property = { ...updatedAnalysis[propertyId] };
    const currentValues = normalizePropertyValue(property);
    
    currentValues.push({
      value: '',
      confidence: 1,
      evidence: {}
    });
    
    property.values = currentValues;
    updatedAnalysis[propertyId] = property;
    onUpdate(updatedAnalysis);

    const newIndex = currentValues.length - 1;
    setNewValueIndices(prev => ({
      ...prev,
      [propertyId]: [...(prev[propertyId] || []), newIndex]
    }));
  };

  const deleteValueFromProperty = (propertyId, index) => {
    const updatedAnalysis = { ...analysis };
    const property = { ...updatedAnalysis[propertyId] };
    const currentValues = normalizePropertyValue(property);
    
    // Remove the value at the specified index
    currentValues.splice(index, 1);
    
    // If we have no values left, add an empty one
    if (currentValues.length === 0) {
      currentValues.push({
        value: '',
        confidence: 1,
        evidence: {}
      });
    }
    
    property.values = currentValues;
    updatedAnalysis[propertyId] = property;
    onUpdate(updatedAnalysis);

    // Update the new value indices
    setNewValueIndices(prev => ({
      ...prev,
      [propertyId]: (prev[propertyId] || []).filter(i => i !== index)
    }));
  };

  const getPropertyDataType = (property, templateProperty) => {
    return property.metadata?.property_type || 
           templateProperty?.type || 
           'text';
  };

  return (
    <div className="border rounded">
      <table className="table table-hover mb-0">
        <tbody>
          {Object.entries(groupedProperties).map(([group, properties]) => (
            <React.Fragment key={group}>
              {properties.map((property) => {
                const templateProperty = getTemplateProperty(property.id);
                const propertyInfoId = `property-info-${property.id}`;
                const dataType = getPropertyDataType(property, templateProperty);
                
                return (
                  <tr key={property.id}>
                    <td className="border-end bg-white" style={{ width: '30%' }}>
                      <div className="p-3">
                        <div className="fw-medium mb-1">
                          {property.label || property.id}
                          <span 
                            id={propertyInfoId}
                            className="ms-2 cursor-pointer"
                          >
                            <Info size={14} className="text-muted" />
                          </span>
                        </div>
                        <PropertyInfoTooltip
                          target={propertyInfoId}
                          property={property}
                          templateProperty={templateProperty}
                          isOpen={tooltipStates[property.id] || false}
                          toggle={() => toggleTooltip(property.id)}
                        />
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary-subtle text-primary">
                            {dataType}
                          </span>
                          {property.metadata?.is_array && (
                            <span className="badge bg-info-subtle text-info">
                              Array
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="bg-white">
                      <div className="p-3">
                        <div className="mb-2">
                          {property.normalizedValues.map((val, index) => (
                            <EditableValue
                              key={`${property.id}-${index}`}
                              value={val.value}
                              dataType={dataType}
                              onValueChange={(newValue) => 
                                updatePropertyValue(property.id, newValue, null, index)
                              }
                              onTypeChange={(newType) => 
                                updatePropertyValue(property.id, null, newType, index)
                              }
                              onDelete={() => deleteValueFromProperty(property.id, index)}
                              isMultiValue={true}
                              index={index}
                              isNewValue={newValueIndices[property.id]?.includes(index)}
                              evidence={val.evidence}
                              confidence={val.confidence}
                              templateType={templateProperty?.type}
                            />
                          ))}
                        </div>
                        <Button
                          color="light"
                          size="sm"
                          className="d-flex align-items-center gap-1"
                          onClick={() => addValueToProperty(property.id)}
                        >
                          <Plus size={14} />
                          Add Value
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PropertyTable;