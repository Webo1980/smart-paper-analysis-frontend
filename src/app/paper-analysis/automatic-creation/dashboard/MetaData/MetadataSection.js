'use client';
import React, { useState } from 'react';
import { useAnalysis, useTrackEvaluation } from '../../contexts/AnalysisContext';
import ApiService from '../../../services/ApiService';
import { Cite } from '@citation-js/core';
import { parseCiteResult } from 'utils';
import DataEntryCard from './DataEntryCard';
import MetadataResultsCard from './MetadataResultsCard';

const MetadataSection = () => {
  const trackEvaluation = useTrackEvaluation();
  const { state, dispatch } = useAnalysis();
  const [paperUrl, setPaperUrl] = useState('');
  const apiService = ApiService.getInstance();

  const parseIdentifier = (input) => {
    let entryParsed;
    if (input.startsWith('http')) {
      entryParsed = input.trim().substring(input.trim().indexOf('10.'));
    } else {
      entryParsed = input.trim();
    }
    return entryParsed;
  };

  const handleAnalyze = async () => {
    if (!paperUrl.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a paper URL or DOI' });
      return;
    }

    dispatch({ type: 'SET_METADATA_STATUS', payload: 'processing' });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const parsedDoi = parseIdentifier(paperUrl);
      const paper = await Cite.async(parsedDoi);
      
      if (!paper) {
        throw new Error('No paper data found');
      }

      const parseResult = parseCiteResult(paper);
      
      const metadata = {
        title: parseResult.paperTitle,
        authors: parseResult.paperAuthors.map(author => author.name),
        abstract: paper.data[0]?.abstract?.replace(/<[^>]*>/g, '') || null,
        doi: parseResult.doi?.toLowerCase(),
        url: parseResult.url,
        publicationDate: parseResult.paperPublicationYear ? 
          new Date(parseResult.paperPublicationYear, parseResult.paperPublicationMonth || 0).toISOString() : null,
        venue: parseResult.publishedIn,
        status: 'success'
      };

      // Update metadata in state
      dispatch({ type: 'SET_METADATA', payload: metadata });
      dispatch({ type: 'COMPLETE_STEP', payload: 'metadata' });

      // Track evaluation only after metadata is complete and step is marked as completed
      trackEvaluation('metadata', {
        metadata,
        timestamp: new Date().toISOString(),
        step: 'metadata',
        status: 'completed'
      });

    } catch (err) {
      console.error('Metadata analysis error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to analyze paper' });
      dispatch({ type: 'SET_METADATA_STATUS', payload: 'error' });
      
      // Track error in evaluation
      trackEvaluation('metadata', {
        error: err.message || 'Failed to analyze paper',
        timestamp: new Date().toISOString(),
        step: 'metadata',
        status: 'error'
      });
    }
  };

  const handleModeChange = (mode) => {
    dispatch({ type: 'SET_ANALYSIS_MODE', payload: mode });
  };

  const isProcessing = state.metadata.status === 'processing';
  const isMetadataReady = state.completedSteps.metadata && state.metadata.title;

  return (
    <div className="mt-5 mb-4">
      <div className="position-relative">
        <div
          style={{
            position: 'absolute',
            top: '-29px',
            background: '#e86161',
            padding: '5px 10px',
            borderRadius: '8px 8px 0 0',
            border: '1px solid #0a58ca',
            borderBottom: 'none',
            boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
          }}
        >
          <h5 className="mb-0" style={{ color: 'white', fontSize: '16px', fontWeight: '500' }}>
            Metadata Entry
          </h5>
        </div>
        <DataEntryCard 
          analysisMode={state.analysisMode}
          handleModeChange={handleModeChange}
          paperUrl={paperUrl}
          setPaperUrl={setPaperUrl}
          isProcessing={isProcessing}
          handleAnalyze={handleAnalyze}
        />
      </div>

      {isMetadataReady && (
        <MetadataResultsCard metadata={state.metadata} />
      )}
    </div>
  );
};

export default MetadataSection;