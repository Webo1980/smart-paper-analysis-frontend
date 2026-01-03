import React, { useState, useRef } from 'react';
import { Card, CardBody, CardTitle, CardText, Alert, Spinner } from 'reactstrap';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Calendar,
  Users,
  FileDigit,
  Link2,
  Landmark
} from 'lucide-react';
import { useAnalysis } from '../../contexts/AnalysisContext';
import AutoTransition from '../../../common/AutoTransition';

const MetadataResultsCard = () => {
  const { state, dispatch } = useAnalysis();
  const { metadata } = state;
  console.log(state);
  const getIconForField = (field) => {
    switch (field) {
      case 'title':
        return <FileDigit size={20} />;
      case 'authors':
        return <Users size={20} />;
      case 'publicationDate':
        return <Calendar size={20} />;
      case 'doi':
        return <FileText size={20} />;
      case 'url':
        return <Link2 size={20} />;
      case 'venue':
        return <Landmark size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const formatValue = (field, value) => {
    if (!value) return null;

    switch (field) {
      case 'authors':
        return Array.isArray(value) ? value.join(', ') : value;
      case 'publicationDate':
        try {
          return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric'
          });
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  const renderExternalLink = (field, value) => {
    if (!value) return null;

    const href = field === 'doi' 
      ? `https://doi.org/${value}`
      : value;

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary d-inline-flex align-items-center gap-1"
        aria-label={`View ${field}`}
      >
        <ExternalLink size={16} />
        View
      </a>
    );
  };
  console.log(state.analysisMode);
  const renderField = (field, label) => {
    const value = metadata[field];
    const isPresent = !!value;
    const formattedValue = formatValue(field, value);
    
    return (
      <Card className={`mb-3 border-${isPresent ? 'success' : 'warning'}`}>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              {isPresent ? (
                <CheckCircle size={20} className="text-success" />
              ) : (
                <AlertCircle size={20} className="text-warning" />
              )}
              <div className="d-flex align-items-center gap-2">
                {getIconForField(field)}
                <CardTitle tag="h5" className="mb-0 text-capitalize">
                  {label}
                </CardTitle>
              </div>
            </div>
            {(field === 'doi' || field === 'url') && renderExternalLink(field, value)}
          </div>
          
          {isPresent ? (
            <CardText 
              className={`mt-2 small text-muted ${field === 'abstract' ? 'p-3 bg-light rounded' : ''}`}
              style={field === 'abstract' ? { 
                maxHeight: '200px', 
                overflowY: 'auto'
              } : {}}
            >
              {formattedValue}
            </CardText>
          ) : (
            <CardText className="mt-2 small text-warning">
              No {label.toLowerCase()} information found
            </CardText>
          )}
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="position-relative mt-5">
      <div
        className="position-absolute"
        style={{
          top: '-29px',
          background: '#e86161',
          padding: '5px 10px',
          borderRadius: '8px 8px 0 0',
          border: '1px solid #0a58ca',
          borderBottom: 'none',
          boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <h5 className="mb-0 text-white" style={{ fontSize: '16px', fontWeight: '500' }}>
          <FileText className="me-2" size={20} />
          Metadata Analysis Results
        </h5>
      </div>

      <Card>
        <CardBody>
          <div className="mb-4">
            <p className="text-muted">
              {state.analysisMode === 'automatic' 
                ? "Automatically analyzing metadata" 
                : "Review the extracted metadata"}
            </p>
          </div>

          {metadata.status === 'processing' ? (
            <div className="text-center py-4">
              <Spinner color="primary" />
              <p className="mt-3 text-muted">Analyzing document metadata...</p>
            </div>
          ) : (
            <>
              <div className="row g-4">
                {[
                  ['title', 'Title'],
                  ['authors', 'Authors'],
                  ['abstract', 'Abstract'],
                  ['doi', 'DOI'],
                  ['url', 'URL'],
                  ['publicationDate', 'Publication Date']
                ].map(([field, label]) => (
                  <div key={field} className={field === 'abstract' ? 'col-12' : 'col-md-6'}>
                    {renderField(field, label)}
                  </div>
                ))}
              </div>
              {state.analysisMode === 'automatic' && <AutoTransition />}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default MetadataResultsCard;