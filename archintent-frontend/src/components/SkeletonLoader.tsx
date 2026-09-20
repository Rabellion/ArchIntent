import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'grid' | 'form' | 'table';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'card', count = 3 }) => {
  const skeletonCard = () => (
    <div key={Math.random()} className="bg-slate-900 rounded-lg shadow overflow-hidden">
      <div className="bg-slate-700 h-48 w-full animate-pulse"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
        <div className="h-3 bg-slate-700 rounded w-full animate-pulse"></div>
        <div className="h-3 bg-slate-700 rounded w-2/3 animate-pulse"></div>
      </div>
    </div>
  );

  const skeletonList = () => (
    <div key={Math.random()} className="space-y-3">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-slate-900 rounded-lg shadow">
            <div className="w-12 h-12 bg-slate-700 rounded-full flex-shrink-0 animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/4 animate-pulse"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ))}
    </div>
  );

  const skeletonGrid = () => (
    <div key={Math.random()} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="bg-slate-900 rounded-lg shadow overflow-hidden">
            <div className="bg-slate-700 h-48 w-full animate-pulse"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-slate-700 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-slate-700 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        ))}
    </div>
  );

  const skeletonForm = () => (
    <div key={Math.random()} className="space-y-4 max-w-md">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-slate-700 rounded w-1/4 animate-pulse"></div>
            <div className="h-10 bg-slate-700 rounded w-full animate-pulse"></div>
          </div>
        ))}
      <div className="h-10 bg-slate-700 rounded w-full animate-pulse"></div>
    </div>
  );

  const skeletonTable = () => (
    <div key={Math.random()} className="space-y-3">
      <div className="flex gap-4 p-4 bg-slate-800 rounded-lg">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="h-4 bg-slate-700 rounded flex-1 animate-pulse"
            ></div>
          ))}
      </div>
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-slate-900 rounded-lg shadow">
            {Array(4)
              .fill(0)
              .map((_, j) => (
                <div
                  key={j}
                  className="h-4 bg-slate-700 rounded flex-1 animate-pulse"
                ></div>
              ))}
          </div>
        ))}
    </div>
  );

  const loaders: Record<string, () => React.JSX.Element> = {
    card: skeletonCard,
    list: skeletonList,
    grid: skeletonGrid,
    form: skeletonForm,
    table: skeletonTable,
  };

  return (
    <div className="w-full">
      {type === 'grid'
        ? skeletonGrid()
        : type === 'list'
          ? skeletonList()
          : type === 'form'
            ? skeletonForm()
            : type === 'table'
              ? skeletonTable()
              : Array(count)
                  .fill(0)
                  .map(() => skeletonCard())}
    </div>
  );
};

export default SkeletonLoader;
