import React from 'react';
import { Database, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  showButton?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  showButton = true,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon || (
        <Database className="w-16 h-16 text-slate-500 mb-4" />
      )}
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-400 text-center mb-6 max-w-sm">{message}</p>
      {showButton && actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
