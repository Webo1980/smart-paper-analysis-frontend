import { configureStore } from '@reduxjs/toolkit';
import paperAnalysisReducer from './paperAnalysisSlice_old';

export const store = configureStore({
  reducer: {
    paperAnalysis: paperAnalysisReducer,
  },
});