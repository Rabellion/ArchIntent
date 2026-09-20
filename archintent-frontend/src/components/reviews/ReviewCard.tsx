import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import StarRating from './StarRating';
import type { ReviewItem } from '../../types/reviews';

interface ReviewCardProps {
  review: ReviewItem;
}

const avatarColors = [
  'bg-rose-500/15 text-rose-300',
  'bg-sky-500/15 text-sky-300',
  'bg-emerald-500/15 text-emerald-300',
  'bg-amber-500/15 text-amber-300',
  'bg-indigo-500/15 text-indigo-300',
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

const getDateLabel = (value: string): string => {
  if (/^[A-Za-z]+\s\d{4}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const reviewerName = review.reviewer?.full_name || 'Anonymous';
  const initials = getInitials(reviewerName);
  const colorClass = avatarColors[review.review_id % avatarColors.length];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${colorClass}`}>
            {initials}
          </div>
          <p className="font-semibold text-slate-100">{reviewerName}</p>
        </div>
        <p className="text-sm text-slate-400">{getDateLabel(review.created_at)}</p>
      </div>

      <div className="mb-3">
        <StarRating rating={review.rating} size="sm" />
      </div>

      {review.review_title ? (
        <h4 className="mb-2 text-base font-semibold text-slate-100">{review.review_title}</h4>
      ) : null}

      {review.review_text ? (
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{review.review_text}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {review.project?.project_type ? (
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-300">
            {review.project.project_type}
          </span>
        ) : null}
        {review.project?.project_title ? (
          <span className="text-slate-400">{review.project.project_title}</span>
        ) : null}
        {(review.is_verified ?? true) ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
            <CheckCircle2 size={12} /> Verified Review
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default ReviewCard;
