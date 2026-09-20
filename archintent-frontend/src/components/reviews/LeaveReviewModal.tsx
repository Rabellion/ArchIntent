import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import axiosInstance from '../../api/axios';
import StarRating from './StarRating';
import type { ReviewItem, RevieweeType } from '../../types/reviews';

interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  revieweeId: number;
  revieweeType: RevieweeType;
  revieweeName: string;
  onSuccess: (review: ReviewItem) => void;
}

const ratingLabels: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  isOpen,
  onClose,
  projectId,
  revieweeId,
  revieweeType,
  revieweeName,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setRating(0);
      setReviewTitle('');
      setReviewText('');
      setSubmitting(false);
      setSubmitted(false);
      setError('');
    }
  }, [isOpen]);

  const subtitle = useMemo(() => {
    if (revieweeType === 'architect') {
      return "Share your experience with this architect's design work";
    }
    return 'Share your experience with this construction company';
  }, [revieweeType]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    if (!rating) {
      setError('Rating is required');
      return;
    }

    if (reviewText.trim().length > 0 && reviewText.trim().length < 20) {
      setError('Review text must be at least 20 characters if provided');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await axiosInstance.post('/reviews', {
        project_id: projectId,
        reviewee_id: revieweeId,
        reviewee_type: revieweeType,
        rating,
        review_title: reviewTitle.trim() || null,
        review_text: reviewText.trim() || null,
      });

      const createdReview: ReviewItem = response.data?.data;
      onSuccess(createdReview);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-100">Review {revieweeName}</h3>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-500/15 text-green-600">
              <CheckCircle2 size={34} />
            </div>
            <p className="text-2xl font-bold text-slate-100">Review Submitted!</p>
            <p className="mt-2 text-slate-400">Thank you for your feedback</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-lg border border-slate-700 bg-slate-800 p-4">
              <p className="mb-2 text-sm font-medium text-slate-300">Rating</p>
              <StarRating rating={rating} size="lg" interactive onRate={setRating} />
              {rating > 0 ? (
                <p className="mt-2 text-sm font-medium text-indigo-300">{ratingLabels[rating]}</p>
              ) : null}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-300">Title (optional)</label>
              <input
                type="text"
                maxLength={255}
                placeholder="Summarize your experience"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-300">Your Review (optional)</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Describe your experience working with this architect/contractor. What went well? What could be improved?"
                rows={5}
                maxLength={2000}
                className="min-h-[120px] w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{reviewText.length}/2000</p>
            </div>

            {error ? (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Submitting...
                  </span>
                ) : (
                  'Submit Review'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaveReviewModal;
