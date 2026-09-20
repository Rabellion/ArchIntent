import React from 'react';
import StarRating from './StarRating';
import type { ReviewSummaryData } from '../../types/reviews';

interface ReviewSummaryProps {
  summary: ReviewSummaryData;
}

const barColors: Record<number, string> = {
  5: 'bg-green-500',
  4: 'bg-lime-500',
  3: 'bg-yellow-400',
  2: 'bg-orange-400',
  1: 'bg-red-500',
};

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ summary }) => {
  const total = summary.total_reviews || 0;
  const average = Number.isFinite(summary.average_rating) ? summary.average_rating : 0;

  const getCount = (star: number): number => {
    const breakdown = summary.rating_breakdown as Record<string, number>;
    return Number(breakdown[String(star)] ?? 0);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-[220px,1fr] md:items-center">
        <div>
          <p className="text-5xl font-bold text-slate-100">{average.toFixed(1)}</p>
          <div className="mt-2">
            <StarRating rating={average} />
          </div>
          <p className="mt-2 text-sm text-slate-400">{total} reviews</p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = getCount(star);
            const width = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={star} className="grid grid-cols-[40px,1fr,28px] items-center gap-2 text-sm">
                <span className="text-slate-300">{star} ★</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full ${barColors[star]}`} style={{ width: `${width}%` }} />
                </div>
                <span className="text-right text-slate-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReviewSummary;
