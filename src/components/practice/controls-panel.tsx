'use client';

import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Square, RotateCcw, VolumeX } from 'lucide-react';
import useSpeechRecognition from '@/hooks/use-speech-recognition';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Mode, Product } from '@/types';
import TipsPanel from './tips-panel';

interface ControlsPanelProps {
  onUserResponse: (transcript: string) => void;
  gameState: string;
  timer: number;
  duration: number;
  onRestart: () => void;
  product: Product;
  mode: Mode;
  isAvatarSpeaking: boolean;
}

export default function ControlsPanel({ onUserResponse, gameState, timer, duration, onRestart, product, mode, isAvatarSpeaking }: ControlsPanelProps) {
  const { isListening, startRecognition, stopRecognition } = useSpeechRecognition({
    onStop: (finalTranscript) => onUserResponse(finalTranscript),
  });

  const isFinished = gameState === 'finished';
  const canRecord = !isFinished && !isAvatarSpeaking;

  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopRecognition();
    } else if (canRecord) {
      startRecognition();
    }
  }, [isListening, canRecord, startRecognition, stopRecognition]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording]);


  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = (timer / duration) * 100;
  const isTimeLow = timer <= 20;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-center">Controles</CardTitle>
        <CardDescription className="text-center">
            {gameState === 'pitching' && 'Fase de Pitch'}
            {gameState === 'objections' && 'Fase de Objeciones'}
            {gameState === 'finished' && 'Simulación Terminada'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center">
        <div className="my-auto flex flex-col items-center gap-6">
          {isFinished ? (
              <Alert>
                  <AlertTitle>¡Buen trabajo!</AlertTitle>
                  <AlertDescription>
                  Has completado la simulación. Puedes revisar la conversación o iniciar una nueva práctica.
                  </AlertDescription>
              </Alert>
          ) : (
            <div className="w-full text-center">
              <div className={cn("font-mono text-6xl font-bold tracking-tighter", isTimeLow && "text-destructive")}>
                {formatTime(timer)}
              </div>
              <Progress value={progress} className={cn("w-full h-3 mt-2", isTimeLow && "[&>div]:bg-destructive")} />
            </div>
          )}

          <div className="w-full flex flex-col items-center gap-4">
              <Button
              size="icon"
              className={cn("h-24 w-24 rounded-full shadow-lg", isListening ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90')}
              onClick={toggleRecording}
              disabled={!canRecord && !isListening}
              aria-label={isListening ? 'Detener grabación' : 'Iniciar grabación'}
              >
              {isAvatarSpeaking ? <VolumeX className="h-10 w-10" /> : isListening ? <Square className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
              </Button>
              <p className="text-sm text-muted-foreground h-4">
                  {isAvatarSpeaking ? 'El cliente IA está hablando...' : isListening ? 'Grabando... (Presiona Espacio para parar)' : canRecord ? 'Presiona para hablar (Espacio)' : ''}
              </p>
          </div>

          {isFinished && (
              <Button onClick={onRestart} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Practicar de nuevo
              </Button>
          )}
        </div>
        <div className="md:hidden w-full mt-auto">
            <TipsPanel product={product} isSheet={true} />
        </div>
      </CardContent>
    </Card>
  );
}
