'use client';

import type { Product, Mode, ConversationMessage } from '@/types';
import AvatarDisplay from './avatar-display';
import ControlsPanel from './controls-panel';
import TipsPanel from './tips-panel';
import ChatMessage from './chat-message';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useEffect, useRef } from 'react';

interface SimulationViewProps {
  product: Product;
  mode: Mode;
  gameState: string;
  timer: number;
  conversation: ConversationMessage[];
  onUserResponse: (transcript: string) => void;
  onRestart: () => void;
  isAvatarSpeaking: boolean;
}

export default function SimulationView({ 
  product, 
  mode, 
  gameState,
  timer, 
  conversation, 
  onUserResponse,
  onRestart,
  isAvatarSpeaking
}: SimulationViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation]);

  const pitchDuration = 120;
  const objectionsDuration = 60;
  const currentDuration = gameState === 'pitching' ? pitchDuration : objectionsDuration;
  
  return (
    <div className="container mx-auto p-4 h-[calc(100vh-100px)]">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
        {/* Tips Panel (Desktop) */}
        <div className="hidden md:block md:col-span-1">
          <TipsPanel product={product} />
        </div>

        {/* Main Content */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4 h-full">
          <AvatarDisplay mode={mode} isSpeaking={isAvatarSpeaking} />
          <Card className="flex-1 flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {conversation.map((msg, index) => (
                  <ChatMessage key={index} sender={msg.sender} text={msg.text} isLoading={msg.isLoading} />
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="col-span-1 md:col-span-1">
          <ControlsPanel
            onUserResponse={onUserResponse}
            gameState={gameState}
            timer={timer}
            duration={currentDuration}
            onRestart={onRestart}
            product={product}
            mode={mode}
            isAvatarSpeaking={isAvatarSpeaking}
          />
        </div>
      </div>
    </div>
  );
}
