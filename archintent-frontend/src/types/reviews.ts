export type RevieweeType = 'architect' | 'contractor';

export interface ReviewItem {
  review_id: number;
  project_id?: number;
  reviewer_id?: number;
  reviewee_id?: number;
  reviewee_type?: RevieweeType;
  rating: number;
  review_title?: string | null;
  review_text?: string | null;
  is_verified?: boolean;
  created_at: string;
  // The architect dashboard endpoint returns these flattened, rather than
  // the nested reviewer/review_text shape the public review list uses.
  reviewer_name?: string;
  comment?: string;
  reviewer?: {
    full_name: string;
  };
  reviewee?: {
    full_name: string;
  };
  project?: {
    project_title?: string;
    project_type?: string;
  };
}

export interface ReviewSummaryData {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: Record<number, number> | Record<string, number>;
}

export interface CanReviewResponse {
  can_review: boolean;
  reason: string | null;
  already_reviewed: boolean;
  review: ReviewItem | null;
}
