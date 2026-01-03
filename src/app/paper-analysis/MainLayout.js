'use client';
import Header from './common/Header';
import ProgressBar from './common/ProgressBar';
import { GlobalProvider } from './automatic-creation/contexts/GlobalContext_old';

export default function MainLayout({ children }) {
  return (
    <GlobalProvider>
      <div className="container py-4">
        <Header />
        {children}
        <ProgressBar />
      </div>
    </GlobalProvider>
  );
}
