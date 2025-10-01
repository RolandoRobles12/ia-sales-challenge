'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupNumber } from '@/types';

interface StarRatingProps {
  groupNumber: GroupNumber;
  currentRating?: number;
  onRate: (stars: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  disabled?: boolean;
}

export function StarRating({ groupNumber, currentRating, onRate, disabled }: StarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async (stars: 1 | 2 | 3 | 4 | 5) => {
    if (disabled || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onRate(stars);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = hoveredStar ? star <= hoveredStar : currentRating ? star <= currentRating : false;
          
          return (
            <button
              key={star}
              onClick={() => handleClick(star as 1 | 2 | 3 | 4 | 5)}
              onMouseEnter={() => !disabled && setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              disabled={disabled || isSubmitting}
              className={cn(
                "transition-all transform hover:scale-110",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  isActive ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                )}
              />
            </button>
          );
        })}
      </div>
      {currentRating && (
        <p className="text-sm text-muted-foreground">
          Ya calificaste con {currentRating} {currentRating === 1 ? 'estrella' : 'estrellas'}
        </p>
      )}
    </div>
  );
}

interface GroupRatingCardProps {
  groupNumber: GroupNumber;
  averageStars: number;
  totalRatings: number;
  currentUserRating?: number;
  onRate: (stars: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  disabled?: boolean;
}

export function GroupRatingCard({
  groupNumber,
  averageStars,
  totalRatings,
  currentUserRating,
  onRate,
  disabled
}: GroupRatingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupo {groupNumber}</CardTitle>
        <CardDescription>
          {totalRatings > 0 ? (
            <>
              Promedio: {averageStars.toFixed(1)} ⭐ ({totalRatings} {totalRatings === 1 ? 'voto' : 'votos'})
            </>
          ) : (
            'Sin calificaciones aún'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StarRating
          groupNumber={groupNumber}
          currentRating={currentUserRating}
          onRate={onRate}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}