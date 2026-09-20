import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  showButton?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong. Please try again.',
  onRetry,
  showButton = true,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-slate-100 mb-2">Oops!</h3>
      <p className="text-slate-400 text-center mb-6 max-w-sm">{message}</p>
      {showButton && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
