import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';
import DevRoleSwitcher from './components/DevRoleSwitcher';
import { UnreadCountProvider } from './context/UnreadCountContext';

const App: React.FC = () => {
  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f1f5f9',
            border: '1px solid #334155',
            zIndex: 9999,
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />
      <Router>
        <UnreadCountProvider>
          <AppRoutes />
        </UnreadCountProvider>
        {import.meta.env.VITE_APP_ENV === 'development' && <DevRoleSwitcher />}
      </Router>
    </>
  );
};

export default App;