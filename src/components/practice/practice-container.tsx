// src/components/practice/practice-container.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Mode, DifficultyLevel, ConversationMessage, CustomerProfile, PitchEvaluation } from '@/types';
import SettingsForm from './settings-form';
import SimulationView from './simulation-view';
import EvaluationResults from './evaluation-results';
import { generateCustomerProfile } from '@/ai/flows/generate-customer-profile';
import { generateDynamicAvatarResponse } from '@/ai/flows/dynamic-avatar-responses';
import { evaluatePitch } from '@/ai/flows/evaluate-pitch';
import useSpeechSynthesis from '@/hooks/use-speech-synthesis';
import useOpenAIVoiceAgent from '@/hooks/use-openai-voice-agent';

type GameState = 'configuring' | 'generating-profile' | 'pitching' | 'objections' | 'evaluating' | 'finished';

const PITCH_DURATION = 120;
const OBJECTIONS_DURATION = 60;

export default function PracticeContainer() {
  const [gameState, setGameState] = useState<GameState>('configuring');
  const [product, setProduct] = useState<Product>('Aviva Contigo');
  const [mode, setMode] = useState<Mode>('Curioso');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('Fácil');
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [timer, setTimer] = useState(PITCH_DURATION);
  const [useVoiceAgent, setUseVoiceAgent] = useState(true);
  const [turnNumber, setTurnNumber] = useState(0);
  const [evaluation, setEvaluation] = useState<PitchEvaluation | null>(null);
  
  const { toast } = useToast();
  const { speak, isSpeaking: isSpeakingTTS, stop: stopTTS } = useSpeechSynthesis();

  // Memoize the onMessage callback to prevent hook re-initialization
  const handleVoiceAgentMessage = useCallback((message: string, isUser: boolean) => {
    setConversation(prev => {
      const last = prev[prev.length - 1];
      
      if (isUser) {
        return [...prev, { sender: 'user', text: message }];
      } else {
        if (last?.sender === 'avatar' && last.isLoading) {
          return prev.map((msg, idx) => 
            idx === prev.length - 1 
              ? { ...msg, text: msg.text + message, isLoading: false }
              : msg
          );
        } else if (last?.sender === 'avatar' && !last.isLoading) {
          return prev.map((msg, idx) => 
            idx === prev.length - 1 
              ? { ...msg, text: msg.text + message }
              : msg
          );
        } else {
          return [...prev, { sender: 'avatar', text: message, isLoading: false }];
        }
      }
    });
  }, []);

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
    onMessage: handleVoiceAgentMessage,
  });

  const isSpeaking = useVoiceAgent ? voiceAgentSpeaking : isSpeakingTTS;

  const handleStartPractice = useCallback(async (settings: { 
    product: Product; 
    mode: Mode; 
    difficultyLevel: DifficultyLevel 
  }) => {
    setProduct(settings.product);
    setMode(settings.mode);
    setDifficultyLevel(settings.difficultyLevel);
    
    // Generar perfil dinámico del cliente
    setGameState('generating-profile');
    
    try {
      console.log('🎭 Generando perfil de cliente...');
      const profile = await generateCustomerProfile({
        product: settings.product,
        mode: settings.mode,
        difficultyLevel: settings.difficultyLevel,
      });
      
      console.log('✅ Perfil generado:', profile);
      setCustomerProfile(profile);
      
      // Mensaje inicial del cliente
      const initialMessage = 'Hola.';
      setConversation([{ sender: 'avatar', text: initialMessage }]);
      
      setGameState('pitching');
      setTimer(PITCH_DURATION);
      setTurnNumber(1);

      if (useVoiceAgent) {
        await connectVoiceAgent();
      } else {
        speak(initialMessage);
      }
      
    } catch (error) {
      console.error('Error generando perfil:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo generar el perfil del cliente. Intenta de nuevo.',
      });
      setGameState('configuring');
    }
  }, [useVoiceAgent, connectVoiceAgent, speak, toast]);
  
  const restartPractice = useCallback(() => {
    if (useVoiceAgent) {
      disconnectVoiceAgent();
    } else {
      stopTTS();
    }
    setGameState('configuring');
    setConversation([]);
    setTimer(PITCH_DURATION);
    setCustomerProfile(null);
    setTurnNumber(0);
    setEvaluation(null);
  }, [useVoiceAgent, disconnectVoiceAgent, stopTTS]);

  const handleUserResponse = useCallback(async (transcript: string) => {
    if (!transcript || useVoiceAgent || !customerProfile) return;
    
    stopTTS();
    setConversation(prev => [...prev, { sender: 'user', text: transcript }]);
    setTurnNumber(prev => prev + 1);

    const avatarMessageId = Date.now();
    setConversation(prev => [...prev, { 
      id: avatarMessageId, 
      sender: 'avatar', 
      text: '', 
      isLoading: true 
    }]);

    try {
      await generateDynamicAvatarResponse({
        pitchText: transcript,
        product,
        customerProfile: {
          name: customerProfile.name,
          age: customerProfile.age,
          occupation: customerProfile.occupation,
          context: customerProfile.context,
          objections: customerProfile.objections,
          commonQuestions: customerProfile.commonQuestions,
          attitudeTrait: customerProfile.attitudeTrait,
          difficultyLevel: customerProfile.difficultyLevel,
        },
        conversationHistory: conversation,
        turnNumber,
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
        description: "No se pudo obtener una respuesta del avatar.",
      });
      setConversation(prev => prev.filter(msg => msg.id !== avatarMessageId));
    }
  }, [useVoiceAgent, stopTTS, product, customerProfile, conversation, turnNumber, speak, toast]);
  
  // Evaluar el pitch cuando termine
  const performEvaluation = useCallback(async () => {
    if (!customerProfile) return;
    
    setGameState('evaluating');
    
    try {
      console.log('📊 Evaluando pitch...');
      const result = await evaluatePitch({
        product,
        customerProfile: {
          name: customerProfile.name,
          occupation: customerProfile.occupation,
          objections: customerProfile.objections,
          attitudeTrait: customerProfile.attitudeTrait,
        },
        conversation: conversation.map(msg => ({
          sender: msg.sender,
          text: msg.text,
        })),
      });
      
      console.log('✅ Evaluación completada:', result);
      setEvaluation(result);
      setGameState('finished');
      
      if (useVoiceAgent) {
        disconnectVoiceAgent();
      }
      
    } catch (error) {
      console.error('Error evaluando pitch:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo evaluar el pitch. Mostrando resultados sin evaluación.',
      });
      setGameState('finished');
    }
  }, [customerProfile, product, conversation, useVoiceAgent, disconnectVoiceAgent, toast]);
  
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
          description: 'Evaluando tu pitch...' 
        });
        performEvaluation();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, timer, toast, speak, useVoiceAgent, performEvaluation]);

  useEffect(() => {
    if (voiceAgentError) {
      toast({
        variant: 'destructive',
        title: 'Error del agente de voz',
        description: voiceAgentError.message,
      });
    }
  }, [voiceAgentError, toast]);

  if (gameState === 'configuring' || gameState === 'generating-profile') {
    return (
      <SettingsForm 
        onStart={handleStartPractice} 
        useVoiceAgent={useVoiceAgent}
        onToggleVoiceAgent={setUseVoiceAgent}
        isGeneratingProfile={gameState === 'generating-profile'}
      />
    );
  }

  if (gameState === 'finished' && evaluation && customerProfile) {
    return (
      <div>
        <EvaluationResults 
          evaluation={evaluation}
          customerName={customerProfile.name}
          product={product}
        />
        <div className="flex justify-center mt-6">
          <button
            onClick={restartPractice}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90"
          >
            Practicar de Nuevo
          </button>
        </div>
      </div>
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