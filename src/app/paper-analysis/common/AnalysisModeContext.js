'use client';
import React, { createContext, useContext, useState } from 'react';

export const AnalysisModeContext = createContext();

export const AnalysisModeProvider = ({ children }) => {
  const [mode, setMode] = useState('automatic');
  
  return (
    <AnalysisModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AnalysisModeContext.Provider>
  );
};