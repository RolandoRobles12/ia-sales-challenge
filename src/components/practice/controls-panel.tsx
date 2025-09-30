'use client';

import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, Square, RotateCcw, VolumeX } from 'lucide-react';
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
  useVoiceAgent?: boolean;
  voiceAgentConnected?: boolean;
  voiceAgentListening?: boolean;
  onStartVoiceAgentListening?: () => void;
  onStopVoiceAgentListening?: () => void;
}

export default function ControlsPanel({ 
  onUserResponse, 
  gameState, 
  timer, 
  duration, 
  onRestart, 
  product, 
  mode, 
  isAvatarSpeaking,
  useVoiceAgent = false,
  voiceAgentConnected = false,
  voiceAgentListening = false,
  onStartVoiceAgentListening,
  onStopVoiceAgentListening,
}: ControlsPanelProps) {
  
  // Memoize the callback to prevent re-creates
  const handleStop = useCallback((finalTranscript: string) => {
    onUserResponse(finalTranscript);
  }, [onUserResponse]);

  const { isListening, startRecognition, stopRecognition } = useSpeechRecognition({
    onStop: handleStop,
  });

  const isFinished = gameState === 'finished';
  
  // For voice agent: can record if connected and not speaking
  // For speech recognition: can record if not finished and not speaking
  const canRecord = useVoiceAgent 
    ? voiceAgentConnected && !isAvatarSpeaking && !isFinished
    : !isFinished && !isAvatarSpeaking;

  const isCurrentlyListening = useVoiceAgent ? voiceAgentListening : isListening;

  const toggleRecording = useCallback(() => {
    if (useVoiceAgent) {
      // Voice agent mode
      if (voiceAgentListening && onStopVoiceAgentListening) {
        onStopVoiceAgentListening();
      } else if (canRecord && onStartVoiceAgentListening) {
        onStartVoiceAgentListening();
      }
    } else {
      // Speech recognition mode
      if (isListening) {
        stopRecognition();
      } else if (canRecord) {
        startRecognition();
      }
    }
  }, [
    useVoiceAgent, 
    voiceAgentListening, 
    isListening, 
    canRecord, 
    onStartVoiceAgentListening, 
    onStopVoiceAgentListening, 
    startRecognition, 
    stopRecognition
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat && canRecord) {
        event.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording, canRecord]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

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
              className={cn(
                "h-24 w-24 rounded-full shadow-lg", 
                isCurrentlyListening ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
              )}
              onClick={toggleRecording}
              disabled={!canRecord && !isCurrentlyListening}
              aria-label={isCurrentlyListening ? 'Detener grabación' : 'Iniciar grabación'}
            >
              {isAvatarSpeaking ? (
                <VolumeX className="h-10 w-10" />
              ) : isCurrentlyListening ? (
                <Square className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>
            <p className="text-sm text-muted-foreground h-4 text-center">
              {isAvatarSpeaking 
                ? 'El cliente IA está hablando...' 
                : isCurrentlyListening 
                  ? 'Grabando... (Presiona Espacio para parar)' 
                  : canRecord 
                    ? 'Presiona para hablar (Espacio)' 
                    : useVoiceAgent && !voiceAgentConnected
                      ? 'Conectando agente de voz...'
                      : ''}
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