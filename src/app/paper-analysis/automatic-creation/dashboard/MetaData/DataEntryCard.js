'use client';
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardBody,
  Input,
  Button,
  Alert,
  FormGroup,
  Label,
  Form
} from 'reactstrap';
import {
  Loader2,
  Info,
  Sparkles,
  UserCheck,
  Compass
} from 'lucide-react';
import { LoadingSpinner } from '../../../common/LoadingSpinner';

const DOI_REGEX = /^10\.\d{4,}/;
const DOI_BASE_URL = 'https://doi.org/';
const URL_REGEX = /^https?:\/\/.+/;

const DataEntryCard = ({
  analysisMode,
  handleModeChange,
  paperUrl,
  setPaperUrl,
  isProcessing,
  handleAnalyze
}) => {
  const [formattedInput, setFormattedInput] = useState(paperUrl);
  const [isValidInput, setIsValidInput] = useState(false);
  
  useEffect(() => {
    setFormattedInput(paperUrl);
    validateInput(paperUrl);
  }, [paperUrl]);

  const validateInput = (input) => {
    const trimmedInput = input.trim();
    setIsValidInput(DOI_REGEX.test(trimmedInput) || URL_REGEX.test(trimmedInput));
    return trimmedInput;
  };

  const handleInputChange = (e) => {
    const input = validateInput(e.target.value);
    let processed = input;

    if (!input.startsWith('http') && DOI_REGEX.test(input)) {
      processed = `${DOI_BASE_URL}${input}`;
    }

    setFormattedInput(processed);
    setPaperUrl(processed);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    handleAnalyze();
  };

  return (
    <Card className="mb-4">
      <CardBody>
      <Alert color="info" className="mb-4 p-4 shadow-sm rounded">
  <div className="d-flex align-items-center gap-2 mb-2">
    <Compass size={20} className="text-primary" />
    <strong className="text-dark">Getting Started:</strong>
  </div>
  <p className="mb-3 text-muted">
    <strong><u>Please note:</u></strong> All user interactions during this analysis, including data entry, clicks, and system interactions, 
    will be tracked and logged for research and system improvement purposes. This data will be anonymized and will not 
    be linked to any personally identifiable information. You have the right to request access to or deletion of your 
    personal interaction data at any time by contacting us.
  </p>
  <p className="fw-semibold text-dark">
    Paste a URL to your research paper or enter its DOI number below to begin.
  </p>
</Alert>



        <Form onSubmit={handleSubmit}>
          <FormGroup className="mb-4">
            <div className="mb-3">
              {/* 
              <FormGroup check className="mb-2 ps-4">
                <Input
                  type="radio"
                  name="analysisMode"
                  id="automatic"
                  checked={analysisMode === 'automatic'}
                  onChange={() => handleModeChange('automatic')}
                  disabled={isProcessing}
                />
                <Label check for="automatic" className="d-flex align-items-center">
                  <span className="me-2">Full AI Autopilot</span>
                  <span className="badge bg-success me-2">Recommended</span>
                  <Sparkles size={16} className="me-2 text-primary" />
                  <Info
                    id="automaticInfo"
                    size={16}
                    className="text-muted cursor-pointer"
                  />
                </Label>
              </FormGroup>
              <FormGroup check className="ps-4">
                <Input
                  type="radio"
                  name="analysisMode"
                  id="guided"
                  checked={analysisMode === 'user_guided'}
                  onChange={() => handleModeChange('user_guided')}
                  disabled={isProcessing}
                />
                <Label check for="guided" className="d-flex align-items-center">
                  <span className="me-2">User Guided</span>
                  <UserCheck size={16} className="me-2 text-secondary" />
                  <Info
                    id="guidedInfo"
                    size={16}
                    className="text-muted cursor-pointer"
                  />
                </Label>
              </FormGroup>
              */}
            </div>

            <div className="d-flex gap-4">
              <Input
                type="text"
                placeholder="Enter paper URL or DOI"
                onChange={handleInputChange}
                value={formattedInput}
                disabled={isProcessing}
                className={isProcessing ? 'opacity-75' : ''}
              />
              <Button
                type="submit"
                color="primary"
                disabled={isProcessing || !isValidInput}
                style={{ minWidth: '120px' }}
                className="d-flex align-items-center justify-content-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Analyze'
                )}
              </Button>
            </div>
          </FormGroup>
        </Form>

        {isProcessing && (
          <div className="mt-3">
            <div className="d-flex align-items-center justify-content-center text-muted small">
              <LoadingSpinner 
                color="#ff0000"
                size={64}
                text={[
                  "Analyzing paper metadata..."
                ]}
                textClassName="text-lg font-bold"
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default DataEntryCard;