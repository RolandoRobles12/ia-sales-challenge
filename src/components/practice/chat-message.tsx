'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  sender: 'user' | 'avatar';
  text: string;
  isLoading?: boolean;
}

export default function ChatMessage({ sender, text, isLoading }: ChatMessageProps) {
  const isAvatar = sender === 'avatar';
  const avatarImage = PlaceHolderImages.find(p => p.id === 'avatar-png');

  const typingCursor = (
    <span className="animate-pulse" aria-hidden="true">▍</span>
  );

  return (
    <div className={cn('flex items-end gap-2', isAvatar ? 'justify-start' : 'justify-end')}>
      {isAvatar && (
        <Avatar className="h-8 w-8">
          {avatarImage ? <AvatarImage src={avatarImage.imageUrl} alt="Avatar IA" /> : null}
          <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-lg p-3 text-sm shadow-md',
          isAvatar
            ? 'bg-white text-gray-800 rounded-bl-none'
            : 'bg-primary text-primary-foreground rounded-br-none'
        )}
      >
        <p className='whitespace-pre-wrap'>{text}{isLoading && typingCursor}</p>
      </div>
      {!isAvatar && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-accent text-accent-foreground"><User className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
