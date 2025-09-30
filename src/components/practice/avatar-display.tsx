'use client';

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { Mode } from '@/types';
import { cn } from '@/lib/utils';

interface AvatarDisplayProps {
  mode: Mode;
  isSpeaking: boolean;
}

export default function AvatarDisplay({ mode, isSpeaking }: AvatarDisplayProps) {
  const avatarImage = PlaceHolderImages.find(p => p.id === 'avatar-png');

  return (
    <Card className="p-4 flex flex-col items-center justify-center text-center bg-card/50">
      {avatarImage && (
        <div className={cn("relative", isSpeaking ? 'animate-bob' : '')}>
          <Image
            src={avatarImage.imageUrl}
            alt={avatarImage.description}
            data-ai-hint={avatarImage.imageHint}
            width={100}
            height={100}
            className={cn("rounded-full shadow-lg border-4 transition-all", isSpeaking ? "border-primary" : "border-white" )}
          />
          <div className="absolute inset-0 rounded-full animate-blink" />
        </div>
      )}
      <h2 className="mt-4 text-xl font-bold font-headline">Tu Cliente IA</h2>
      <Badge variant="secondary" className="mt-2 text-sm">{mode}</Badge>
    </Card>
  );
}
