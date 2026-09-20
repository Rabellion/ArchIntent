import React, { useMemo, useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

const sizeClasses: Record<NonNullable<StarRatingProps['size']>, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
};

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 'md',
  interactive = false,
  onRate,
}) => {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const roundedRating = useMemo(() => {
    const safe = Number.isFinite(rating) ? rating : 0;
    return Math.max(0, Math.min(5, Math.round(safe)));
  }, [rating]);

  const activeRating = interactive ? hoveredRating ?? roundedRating : roundedRating;
  const displayText = interactive
    ? `${activeRating || 0} out of 5`
    : Number.isInteger(rating)
      ? String(rating)
      : rating.toFixed(1);

  return (
    <div
      className="inline-flex items-center gap-2"
      onMouseLeave={() => {
        if (interactive) {
          setHoveredRating(null);
        }
      }}
    >
      <div className="inline-flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const starValue = index + 1;
          const isFilled = activeRating >= starValue;

          if (interactive) {
            return (
              <button
                key={starValue}
                type="button"
                onMouseEnter={() => setHoveredRating(starValue)}
                onClick={() => onRate?.(starValue)}
                className="focus:outline-none"
              >
                <Star
                  className={`${sizeClasses[size]} ${isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} cursor-pointer transition`}
                />
              </button>
            );
          }

          return (
            <Star
              key={starValue}
              className={`${sizeClasses[size]} ${isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} transition`}
            />
          );
        })}
      </div>
      <span className="text-sm text-gray-700">{displayText}</span>
    </div>
  );
};

export default StarRating;
