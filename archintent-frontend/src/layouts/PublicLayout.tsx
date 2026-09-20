import React from 'react';
import PublicNavbar from '../components/PublicNavbar';

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter">
      <PublicNavbar />
      <main>
        {children}
      </main>
    </div>
  );
};

export default PublicLayout;
