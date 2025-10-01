'use client';

import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupNumber } from '@/types';
import { cn } from '@/lib/utils';

interface WordCloudInputProps {
  groupNumber: GroupNumber;
  onSubmit: (word: string) => Promise<void>;
  disabled?: boolean;
  hasSubmitted?: boolean;
}

export function WordCloudInput({ groupNumber, onSubmit, disabled, hasSubmitted }: WordCloudInputProps) {
  const [word, setWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(word.trim());
      setWord('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        ✓ Ya enviaste tu palabra para este grupo
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Una palabra..."
        maxLength={30}
        disabled={disabled || isSubmitting}
        className="flex-1"
      />
      <Button 
        type="submit" 
        size="icon"
        disabled={!word.trim() || disabled || isSubmitting}
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

interface WordCloudDisplayProps {
  words: { word: string; count: number }[];
  animated?: boolean;
}

export function WordCloudDisplay({ words, animated = true }: WordCloudDisplayProps) {
  if (words.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No hay palabras aún. ¡Sé el primero en compartir!
      </p>
    );
  }

  const maxCount = Math.max(...words.map(w => w.count));
  const minCount = Math.min(...words.map(w => w.count));
  
  const getColor = (count: number) => {
    const intensity = (count - minCount) / (maxCount - minCount || 1);
    if (intensity > 0.7) return 'bg-primary/20 text-primary border-primary/30';
    if (intensity > 0.5) return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    if (intensity > 0.3) return 'bg-green-500/20 text-green-700 border-green-500/30';
    return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  };

  const getFontSize = (count: number) => {
    const intensity = (count - minCount) / (maxCount - minCount || 1);
    if (intensity > 0.7) return 'text-2xl md:text-3xl';
    if (intensity > 0.5) return 'text-xl md:text-2xl';
    if (intensity > 0.3) return 'text-lg md:text-xl';
    return 'text-base';
  };

  const getFontWeight = (count: number) => {
    const intensity = (count - minCount) / (maxCount - minCount || 1);
    if (intensity > 0.7) return 'font-bold';
    if (intensity > 0.5) return 'font-semibold';
    return 'font-medium';
  };
  
  return (
    <div className="flex flex-wrap gap-3 justify-center items-center py-6 min-h-[200px]">
      {words.map(({ word, count }, index) => {
        const colorClass = getColor(count);
        const fontSize = getFontSize(count);
        const fontWeight = getFontWeight(count);
        const animationClass = animated ? "animate-in fade-in-0 zoom-in-95" : "";
        
        return (
          <div
            key={word}
            className={cn(
              "px-4 py-2 rounded-full border-2 transition-all cursor-default hover:scale-110 hover:shadow-lg",
              colorClass,
              fontSize,
              fontWeight,
              animationClass
            )}
            style={{
              animationDelay: animated ? `${index * 50}ms` : '0ms',
            }}
          >
            <span className="flex items-center gap-2">
              {word}
              <span className="text-xs opacity-60 font-normal">
                {count}x
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface GroupWordCloudCardProps {
  groupNumber: GroupNumber;
  words: { word: string; count: number }[];
  hasUserSubmitted?: boolean;
  onSubmit: (word: string) => Promise<void>;
  disabled?: boolean;
}

export function GroupWordCloudCard({
  groupNumber,
  words,
  hasUserSubmitted,
  onSubmit,
  disabled
}: GroupWordCloudCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Grupo {groupNumber} - Word Cloud
        </CardTitle>
        <CardDescription>
          ¿Qué es lo que más te gustó? (Una palabra)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <WordCloudInput
          groupNumber={groupNumber}
          onSubmit={onSubmit}
          disabled={disabled}
          hasSubmitted={hasUserSubmitted}
        />
        <WordCloudDisplay words={words} />
      </CardContent>
    </Card>
  );
}