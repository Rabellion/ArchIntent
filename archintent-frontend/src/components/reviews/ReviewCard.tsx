import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import StarRating from './StarRating';
import type { ReviewItem } from '../../types/reviews';

interface ReviewCardProps {
  review: ReviewItem;
}

const avatarColors = [
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${colorClass}`}>
            {initials}
          </div>
          <p className="font-semibold text-gray-900">{reviewerName}</p>
        </div>
        <p className="text-sm text-gray-500">{getDateLabel(review.created_at)}</p>
      </div>

      <div className="mb-3">
        <StarRating rating={review.rating} size="sm" />
      </div>

      {review.review_title ? (
        <h4 className="mb-2 text-base font-semibold text-gray-900">{review.review_title}</h4>
      ) : null}

      {review.review_text ? (
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{review.review_text}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {review.project?.project_type ? (
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
            {review.project.project_type}
          </span>
        ) : null}
        {review.project?.project_title ? (
          <span className="text-gray-500">{review.project.project_title}</span>
        ) : null}
        {(review.is_verified ?? true) ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">
            <CheckCircle2 size={12} /> Verified Review
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default ReviewCard;
