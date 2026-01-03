import React from 'react';
import { Alert } from 'reactstrap';
import { useAnalysisError } from '../automatic-creation/contexts/AnalysisContext';

export const ErrorDisplay = () => {
  const [error] = useAnalysisError();
  
  if (!error) return null;
  
  return (
    <Alert color="danger" className="mb-4">
      {error}
    </Alert>
  );
};

export const withErrorBoundary = (WrappedComponent) => {
  return function WithErrorBoundary(props) {
    return (
      <>
        <ErrorDisplay />
        <WrappedComponent {...props} />
      </>
    );
  };
};