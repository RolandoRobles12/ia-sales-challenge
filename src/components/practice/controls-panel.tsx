'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Mode, ConversationMessage } from '@/types';
import SettingsForm from './settings-form';
import SimulationView from './simulation-view';
import { generateAvatarResponse } from '@/ai/flows/ai-powered-avatar-responses';
import useSpeechSynthesis from '@/hooks/use-speech-synthesis';
import useOpenAIVoiceAgent from '@/hooks/use-openai-voice-agent';

type GameState = 'configuring' | 'pitching' | 'objections' | 'finished';

const PITCH_DURATION = 120; // 2 minutes
const OBJECTIONS_DURATION = 60; // 1 minute

export default function PracticeContainer() {
  const [gameState, setGameState] = useState<GameState>('configuring');
  const [product, setProduct] = useState<Product>('Aviva Contigo');
  const [mode, setMode] = useState<Mode>('Curioso');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [timer, setTimer] = useState(PITCH_DURATION);
  const [useVoiceAgent, setUseVoiceAgent] = useState(true);
  const { toast } = useToast();
  
  const { speak, isSpeaking: isSpeakingTTS, stop: stopTTS } = useSpeechSynthesis();

  const {
    isConnected: voiceAgentConnected,
    isListening: voiceAgentListening,
    isSpeaking: voiceAgentSpeaking,
    connect: connectVoiceAgent,
    disconnect: disconnectVoiceAgent,
    startListening: startVoiceAgentListening,
    stopListening: stopVoiceAgentListening,
    error: voiceAgentError,
  } = useOpenAIVoiceAgent({
    product,
    mode,
    onMessage: (message, isUser) => {
      setConversation(prev => {
        const last = prev[prev.length - 1];
        
        if (!isUser && last?.sender === 'avatar' && last.isLoading) {
          return prev.map((msg, idx) => 
            idx === prev.length - 1 
              ? { ...msg, text: msg.text + message, isLoading: false }
              : msg
          );
        } else if (isUser) {
          return [...prev, { sender: 'user', text: message }];
        } else {
          return [...prev, { sender: 'avatar', text: message }];
        }
      });
    },
  });

  const isSpeaking = useVoiceAgent ? voiceAgentSpeaking : isSpeakingTTS;

  const handleStartPractice = async (settings: { product: Product; mode: Mode }) => {
    setProduct(settings.product);
    setMode(settings.mode);
    
    // Mensaje inicial del cliente IA
    const initialMessage = 'Hola, ¿qué me ofreces?';
    setConversation([
      { sender: 'avatar', text: initialMessage }
    ]);

    setGameState('pitching');
    setTimer(PITCH_DURATION);

    if (useVoiceAgent) {
      console.log('🚀 Conectando agente de voz...');
      await connectVoiceAgent();
      console.log('✅ Agente conectado');
    } else {
      speak(initialMessage);
    }
  };
  
  const restartPractice = () => {
    if (useVoiceAgent) {
      disconnectVoiceAgent();
    } else {
      stopTTS();
    }
    setGameState('configuring');
    setConversation([]);
    setTimer(PITCH_DURATION);
  };

  const handleUserResponse = async (transcript: string) => {
    if (!transcript || useVoiceAgent) return;
    
    stopTTS();
    setConversation(prev => [...prev, { sender: 'user', text: transcript }]);

    const avatarMessageId = Date.now();
    setConversation(prev => [...prev, { 
      id: avatarMessageId, 
      sender: 'avatar', 
      text: '', 
      isLoading: true 
    }]);

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
          speak(text, true);
        },
        onDone: (finalResponse) => {
          setConversation(prev => prev.map(msg => 
            msg.id === avatarMessageId 
              ? { ...msg, text: finalResponse.responseText, isLoading: false } 
              : msg
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
        toast({ 
          title: 'Tiempo de Pitch terminado', 
          description: 'Ahora comienza la fase de objeciones.' 
        });
        setGameState('objections');
        setTimer(OBJECTIONS_DURATION);
        setConversation(prev => [...prev, { sender: 'avatar', text: message }]);
        
        if (!useVoiceAgent) {
          speak(message);
        }
      } else if (gameState === 'objections') {
        toast({ 
          title: '¡Se acabó el tiempo!', 
          description: 'La simulación ha terminado.' 
        });
        setGameState('finished');
        
        if (useVoiceAgent) {
          disconnectVoiceAgent();
        }
      }
      return;
    }

    const interval = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, timer, toast, speak, useVoiceAgent, disconnectVoiceAgent]);

  useEffect(() => {
    if (voiceAgentError) {
      toast({
        variant: 'destructive',
        title: 'Error del agente de voz',
        description: voiceAgentError.message,
      });
    }
  }, [voiceAgentError, toast]);

  if (gameState === 'configuring') {
    return (
      <SettingsForm 
        onStart={handleStartPractice} 
        useVoiceAgent={useVoiceAgent}
        onToggleVoiceAgent={setUseVoiceAgent}
      />
    );
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
      useVoiceAgent={useVoiceAgent}
      voiceAgentConnected={voiceAgentConnected}
      voiceAgentListening={voiceAgentListening}
      onStartVoiceAgentListening={startVoiceAgentListening}
      onStopVoiceAgentListening={stopVoiceAgentListening}
    />
  );
}