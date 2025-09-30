'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Mode, ConversationMessage } from '@/types';
import SettingsForm from './settings-form';
import SimulationView from './simulation-view';
import { generateAvatarResponse } from '@/ai/flows/ai-powered-avatar-responses';
import useSpeechSynthesis from '@/hooks/use-speech-synthesis';

type GameState = 'configuring' | 'pitching' | 'objections' | 'finished';

const PITCH_DURATION = 120; // 2 minutes
const OBJECTIONS_DURATION = 60; // 1 minute

export default function PracticeContainer() {
  const [gameState, setGameState] = useState<GameState>('configuring');
  const [product, setProduct] = useState<Product>('Aviva Contigo');
  const [mode, setMode] = useState<Mode>('Curioso');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [timer, setTimer] = useState(PITCH_DURATION);
  const { toast } = useToast();
  const { speak, isSpeaking, stop } = useSpeechSynthesis();

  const handleStartPractice = (settings: { product: Product; mode: Mode }) => {
    setProduct(settings.product);
    setMode(settings.mode);
    const initialMessage = 'Hola, ¡gracias por tu tiempo! Cuéntame qué me ofreces.';
    setConversation([
      { sender: 'avatar', text: initialMessage }
    ]);
    speak(initialMessage);
    setGameState('pitching');
    setTimer(PITCH_DURATION);
  };
  
  const restartPractice = () => {
    stop();
    setGameState('configuring');
    setConversation([]);
    setTimer(PITCH_DURATION);
  };

  const handleUserResponse = async (transcript: string) => {
    if (!transcript) return;
    stop(); // Stop any ongoing speech
    setConversation(prev => [...prev, { sender: 'user', text: transcript }]);

    const avatarMessageId = Date.now();
    setConversation(prev => [...prev, { id: avatarMessageId, sender: 'avatar', text: '', isLoading: true }]);

    try {
      await generateAvatarResponse({
        pitchText: transcript,
        product: product,
        mode: mode,
      }, {
        onChunk: ({ text }) => {
          setConversation(prev => prev.map(msg => 
            msg.id === avatarMessageId ? { ...msg, text: msg.text + text } : msg
          ));
          speak(text, true); // Speak chunks as they arrive
        },
        onDone: (finalResponse) => {
          setConversation(prev => prev.map(msg => 
            msg.id === avatarMessageId ? { ...msg, text: finalResponse.responseText, isLoading: false } : msg
          ));
        }
      });
    } catch (error) {
      console.error("Error generating avatar response:", error);
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No se pudo obtener una respuesta del avatar. Por favor, intenta de nuevo.",
      });
      setConversation(prev => prev.filter(msg => msg.id !== avatarMessageId));
    }
  };
  
  useEffect(() => {
    if (gameState !== 'pitching' && gameState !== 'objections') return;

    if (timer <= 0) {
      if (gameState === 'pitching') {
        const message = 'Interesante. Pero tengo algunas dudas...';
        toast({ title: 'Tiempo de Pitch terminado', description: 'Ahora comienza la fase de objeciones.' });
        setGameState('objections');
        setTimer(OBJECTIONS_DURATION);
        setConversation(prev => [...prev, { sender: 'avatar', text: message}]);
        speak(message);
      } else if (gameState === 'objections') {
        toast({ title: '¡Se acabó el tiempo!', description: 'La simulación ha terminado.' });
        setGameState('finished');
      }
      return;
    }

    const interval = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, timer, toast, speak]);


  if (gameState === 'configuring') {
    return <SettingsForm onStart={handleStartPractice} />;
  }

  return (
    <SimulationView
      product={product}
      mode={mode}
      gameState={gameState}
      timer={timer}
      conversation={conversation}
      onUserResponse={handleUserResponse}
      onRestart={restartPractice}
      isAvatarSpeaking={isSpeaking}
    />
  );
}
