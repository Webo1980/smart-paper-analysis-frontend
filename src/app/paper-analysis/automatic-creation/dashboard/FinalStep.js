import React, { useEffect, useState } from 'react';
import { Alert, Card, CardBody, Button } from 'reactstrap';
import { Copy, ExternalLink, Download } from 'lucide-react';
import { generateToken, saveEvaluationData } from '../../services/githubService';
import { useAnalysis } from '../contexts/AnalysisContext';

const FinalStep = () => {
  const { state } = useAnalysis();
  const [token, setToken] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);

  useEffect(() => {
    const saveData = async () => {
      const newToken = generateToken();
      setToken(newToken);
      
      // Create the data object to save
      const data = {
        token: newToken,
        metadata: state.metadata,
        researchFields: state.researchFields,
        researchProblems: state.researchProblems,
        templates: state.templates,
        paperContent: state.paperContent,
        timestamp: new Date().toISOString()
      };
      
      // Include the evaluation data if it exists
      if (state.evaluationData) {
        data.evaluationData = state.evaluationData;
        
        // If there's paper content in evaluationData, merge it with the main paperContent
        if (state.evaluationData.paperContent) {
          data.paperContent = {
            ...data.paperContent,
            evaluationComparison: state.evaluationData.paperContent
          };
        }
      }
      
      setEvaluationData(data);
      console.log("Final data being saved:", data);
      
      try {
        await saveEvaluationData(newToken, data);
      } catch (error) {
        console.error('Error saving evaluation data:', error);
      }
    };
  
    saveData();
  }, [state]);

  const copyToken = () => {
    navigator.clipboard.writeText(token);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText('http://localhost:5173/');
  };

  const downloadJSON = () => {
    if (!evaluationData) return;

    // Create a blob with the data
    const jsonString = JSON.stringify(evaluationData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `evaluation_${token}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="mt-4">
      <CardBody className="p-4">
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-green-600 mb-3">
            🎉 Analysis Complete! 
          </h3>
          <p className="text-lg text-gray-700">
            Thank you for using our Smart Paper Analysis System
          </p>
        </div>

        <Alert color="info" className="mb-4">
          <h4 className="alert-heading mb-2">Your Evaluation Access Token</h4>
          <div className="d-flex align-items-center gap-2 bg-light p-2 rounded">
            <code className="flex-grow-1">{token}</code>
            <Button color="light" size="sm" onClick={copyToken}>
              <Copy size={16} />
            </Button>
          </div>
        </Alert>

        <div className="bg-light p-4 rounded mb-4">
          <h4 className="mb-3">Next Steps:</h4>
          <ol className="list-group list-group-numbered">
            <li className="list-group-item">Visit the evaluation form at: 
              <a 
                href="http://localhost:5173/" 
                target="_blank"
                rel="noopener noreferrer"
                className="ms-2 text-primary d-inline-flex align-items-center"
              >
                Evaluation Form <ExternalLink size={14} className="ms-1" />
              </a>
              <Button 
                color="link" 
                size="sm" 
                className="ms-2 p-0" 
                onClick={copyUrl}
              >
                Copy URL
              </Button>
            </li>
            <li className="list-group-item">Enter your access token to load your pre-filled evaluation data</li>
          </ol>
        </div>

        <div className="text-center">
          <Button 
            color="primary" 
            onClick={downloadJSON}
            disabled={!evaluationData}
            className="d-flex align-items-center justify-content-center gap-2 mx-auto"
          >
            <Download size={16} />
            Download Evaluation Data (JSON)
          </Button>
        </div>

        <div className="text-center text-muted mt-3">
          <p className="mb-0">Your feedback helps improve our system. Thank you for your contribution!</p>
        </div>
      </CardBody>
    </Card>
  );
};

export default FinalStep;