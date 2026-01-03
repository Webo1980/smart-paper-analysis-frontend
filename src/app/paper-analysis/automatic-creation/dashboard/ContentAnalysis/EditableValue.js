import React, { useState, useEffect } from 'react';
import { Edit, Trash, Info } from 'lucide-react';
import { 
  Input, 
  UncontrolledDropdown, 
  DropdownToggle, 
  DropdownMenu, 
  DropdownItem,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
  PopoverBody,
  UncontrolledPopover
} from 'reactstrap';

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'resource', label: 'Resource' }
];

const valueToString = (value) => {
  if (value === null || value === undefined) return '';
  
  // If it's already a string, return it
  if (typeof value === 'string') return value;
  
  // If it's a number or boolean, convert to string
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // If it's an array, join the elements
  if (Array.isArray(value)) {
    return value.map(v => valueToString(v)).filter(v => v !== '').join(', ');
  }
  
  // If it's an object, we need to handle it properly
  if (typeof value === 'object') {
    // Check if it's a JSON string that looks like an object
    try {
      // If the value has common object keys, it's probably a complex object
      // that shouldn't be displayed as JSON
      if (value.inclusion_criteria || value.internal_validation || 
          value.exclusion_criteria || value.external_validation) {
        console.warn('Complex object detected in valueToString, this should have been processed earlier:', value);
        
        // Extract some meaningful text from it
        const parts = [];
        Object.entries(value).forEach(([key, val]) => {
          if (typeof val === 'string' || typeof val === 'number') {
            parts.push(`${key}: ${val}`);
          }
        });
        return parts.length > 0 ? parts.join(', ') : '[Complex Data]';
      }
      
      // Try to extract meaningful properties
      if (value.text) return String(value.text);
      if (value.value) return String(value.value);
      if (value.name) return String(value.name);
      if (value.title) return String(value.title);
      if (value.label) return String(value.label);
      
      // If it has only one property, return its value
      const keys = Object.keys(value);
      if (keys.length === 1) {
        return valueToString(value[keys[0]]);
      }
      
      // For small objects, create a readable string
      if (keys.length <= 3) {
        const parts = [];
        keys.forEach(key => {
          const val = value[key];
          if (typeof val === 'string' || typeof val === 'number') {
            parts.push(`${key}: ${val}`);
          }
        });
        if (parts.length > 0) return parts.join(', ');
      }
      
      // Last resort - it's a complex object that shouldn't be here
      console.warn('Unhandled complex object in UI:', value);
      return '[Complex Data - Please Edit]';
    } catch (e) {
      console.error('Error processing value:', e);
      return String(value);
    }
  }
  
  // Default fallback
  return String(value);
};

// Safe string conversion helper
const safeStringify = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    try {
      // For objects, try to extract text content
      if (value.text) return safeStringify(value.text);
      if (value.content) return safeStringify(value.content);
      if (value.value) return safeStringify(value.value);
      // Otherwise stringify the object
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
};

const EvidencePopover = ({ id, evidence, confidence }) => {
  if (!evidence || Object.keys(evidence).length === 0) return null;

  return (
    <UncontrolledPopover
      target={id}
      placement="top"
      trigger="hover"
      popperClassName="evidence-popover"
    >
      <PopoverBody>
        <div 
          className="evidence-content"
          style={{ 
            maxHeight: '180px',
            overflowY: 'auto',
            paddingRight: '10px'
          }}
        >
          {Object.entries(evidence).map(([section, data], idx) => {
            // Safely handle data which might be a string or object
            let textContent = '';
            let relevanceContent = '';
            
            if (typeof data === 'string') {
              textContent = data;
            } else if (typeof data === 'object' && data !== null) {
              textContent = safeStringify(data.text);
              relevanceContent = safeStringify(data.relevance);
            }
            
            return (
              <div key={idx} className="mb-2">
                <div className="fw-medium">{section}:</div>
                {textContent && (
                  <div className="text-muted small mb-1">
                    "{textContent.trim ? textContent.trim() : textContent}"
                  </div>
                )}
                {relevanceContent && (
                  <div className="text-muted small">
                    {relevanceContent}
                  </div>
                )}
              </div>
            );
          })}
          {typeof confidence !== 'undefined' && confidence !== null && (
            <div className="mt-2 border-top pt-2">
              <strong>Confidence:</strong> {(Number(confidence) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </PopoverBody>
    </UncontrolledPopover>
  );
};

const EditableValue = ({ 
  value, 
  dataType, 
  onValueChange, 
  onTypeChange,
  onDelete,
  isMultiValue,
  index,
  isNewValue = false,
  evidence = {},
  templateType,
  confidence
}) => {
  const [isEditing, setIsEditing] = useState(() => isNewValue);
  const [editedValue, setEditedValue] = useState(() => valueToString(value));
  const [showTypeWarning, setShowTypeWarning] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    setEditedValue(valueToString(value));
  }, [value]);

  const handleValueChange = (newValue) => {
    setEditedValue(newValue);
    onValueChange(newValue, index);
  };

  const resetValue = () => {
    setEditedValue('');
    onValueChange('', index);
  };

  const handleTypeSelect = (type) => {
    if (templateType && type !== templateType) {
      setSelectedType(type);
      setShowTypeWarning(true);
    } else {
      resetValue();
      onTypeChange(type, index);
    }
  };

  const confirmTypeChange = () => {
    resetValue();
    onTypeChange(selectedType, index);
    setShowTypeWarning(false);
  };

  const renderEditableField = () => {
    switch (dataType) {
      case 'date':
        return (
          <Input
            type="date"
            value={editedValue}
            onChange={(e) => handleValueChange(e.target.value)}
            className="form-control-sm"
            autoFocus={isNewValue}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={editedValue}
            onChange={(e) => handleValueChange(e.target.value)}
            className="form-control-sm"
            autoFocus={isNewValue}
          />
        );
      case 'url':
        return (
          <Input
            type="url"
            value={editedValue}
            onChange={(e) => handleValueChange(e.target.value)}
            className="form-control-sm"
            autoFocus={isNewValue}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={editedValue}
            onChange={(e) => handleValueChange(e.target.value)}
            className="form-control-sm"
            autoFocus={isNewValue}
          />
        );
    }
  };

  const displayValue = valueToString(value);
  // Create a safe ID by removing special characters and spaces
  const safeId = `value-evidence-${index}-${Math.random().toString(36).substr(2, 9)}`;
  const hasEvidence = evidence && Object.keys(evidence).length > 0;

  return (
    <div className="d-flex align-items-start gap-2 p-2 border rounded mb-2 bg-white">
      <Modal isOpen={showTypeWarning} toggle={() => setShowTypeWarning(false)}>
        <ModalHeader toggle={() => setShowTypeWarning(false)}>
          Confirm Type Change
        </ModalHeader>
        <ModalBody>
          <Alert color="warning">
            {templateType ? (
              <>
                The template recommends using type <strong>{templateType}</strong> for this property.
                Changing to <strong>{selectedType}</strong> may affect data consistency.
              </>
            ) : (
              "Changing the data type may affect data consistency."
            )}
            Are you sure you want to proceed?
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowTypeWarning(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={confirmTypeChange}>
            Confirm Change
          </Button>
        </ModalFooter>
      </Modal>

      <div className="flex-grow-1 overflow-hidden">
        {isEditing ? (
          renderEditableField()
        ) : (
          <div className="text-break">
            <span className={confidence && confidence < 0.7 ? 'text-warning' : ''}>
              {displayValue || '<empty>'}
            </span>
            {hasEvidence && (
              <span id={safeId} className="ms-2 cursor-pointer">
                <Info size={14} className="text-muted" />
              </span>
            )}
          </div>
        )}
      </div>

      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <UncontrolledDropdown>
          <DropdownToggle caret color="light" size="sm" className="py-1 px-2">
            {DATA_TYPES.find(t => t.value === dataType)?.label || 'Select Type'}
          </DropdownToggle>
          <DropdownMenu>
            {DATA_TYPES.map((type) => (
              <DropdownItem 
                key={type.value}
                active={dataType === type.value}
                onClick={() => handleTypeSelect(type.value)}
              >
                {type.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </UncontrolledDropdown>
        
        <Button
          color="light"
          size="sm"
          className="p-1"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit size={14} />
        </Button>

        {isMultiValue && (
          <Button
            color="danger"
            size="sm"
            className="p-1"
            onClick={() => onDelete(index)}
          >
            <Trash size={14} />
          </Button>
        )}
      </div>

      {hasEvidence && (
        <EvidencePopover
          id={safeId}
          evidence={evidence}
          confidence={confidence}
        />
      )}
    </div>
  );
};

export default EditableValue;