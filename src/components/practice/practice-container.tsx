// src/components/practice/practice-container.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Product, Mode, DifficultyLevel, ConversationMessage, CustomerProfile, PitchEvaluation, PracticeSettings } from '@/types';
import SettingsForm from './settings-form';
import SimulationView from './simulation-view';
import EvaluationResults from './evaluation-results';
import { generateCustomerProfile } from '@/ai/flows/generate-customer-profile';
import { generateDynamicAvatarResponse } from '@/ai/flows/dynamic-avatar-responses';
import { evaluatePitch } from '@/ai/flows/evaluate-pitch';
import useSpeechSynthesis from '@/hooks/use-speech-synthesis';
import useOpenAIVoiceAgent from '@/hooks/use-openai-voice-agent';

type GameState = 'configuring' | 'generating-profile' | 'pitching' | 'objections' | 'evaluating' | 'finished';

export default function PracticeContainer() {
  const [gameState, setGameState] = useState<GameState>('configuring');
  const [product, setProduct] = useState<Product>('Aviva Contigo');
  const [mode, setMode] = useState<Mode>('Curioso');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('Fácil');
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [timer, setTimer] = useState(120);
  const [pitchDuration, setPitchDuration] = useState(120);
  const [qnaDuration, setQnaDuration] = useState(60);
  const [useVoiceAgent, setUseVoiceAgent] = useState(true);
  const [turnNumber, setTurnNumber] = useState(0);
  const [evaluation, setEvaluation] = useState<PitchEvaluation | null>(null);
  
  const { toast } = useToast();
  const { speak, isSpeaking: isSpeakingTTS, stop: stopTTS } = useSpeechSynthesis();

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
    difficultyLevel,
    onMessage: handleVoiceAgentMessage,
  });

  const isSpeaking = useVoiceAgent ? voiceAgentSpeaking : isSpeakingTTS;

  const handleStartPractice = useCallback(async (settings: PracticeSettings) => {
    setProduct(settings.product);
    setMode(settings.mode);
    setDifficultyLevel(settings.difficultyLevel);
    setPitchDuration(settings.pitchDuration);
    setQnaDuration(settings.qnaDuration);
    
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
      
      const initialMessage = 'Hola.';
      setConversation([{ sender: 'avatar', text: initialMessage }]);
      
      setGameState('pitching');
      setTimer(settings.pitchDuration);
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
    console.log('🔄 Reiniciando práctica...');
    
    if (useVoiceAgent) {
      disconnectVoiceAgent();
    } else {
      stopTTS();
    }
    
    setGameState('configuring');
    setConversation([]);
    setTimer(120);
    setPitchDuration(120);
    setQnaDuration(60);
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
  
  const performEvaluation = useCallback(async () => {
    if (!customerProfile) {
      console.error('❌ No hay perfil de cliente para evaluar');
      setGameState('finished');
      return;
    }
    
    console.log('📊 Evaluando pitch...');
    setGameState('evaluating');
    
    // SOLUCIÓN 1: Desconectar agente de voz ANTES de evaluar
    if (useVoiceAgent && voiceAgentConnected) {
      console.log('🔌 Desconectando agente de voz antes de evaluar...');
      disconnectVoiceAgent();
    } else if (!useVoiceAgent) {
      stopTTS();
    }
    
    try {
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
      
    } catch (error) {
      console.error('❌ Error evaluando pitch:', error);
      
      // SOLUCIÓN 2: Mostrar mensaje de error pero permitir continuar
      toast({
        variant: 'destructive',
        title: 'Error en la evaluación',
        description: 'No se pudo evaluar el pitch completamente. Puedes revisar la conversación.',
      });
      
      // Crear evaluación por defecto para no bloquear al usuario
      setEvaluation({
        greeting: 5,
        needIdentification: 5,
        productPresentation: 5,
        benefitsCommunication: 5,
        objectionHandling: 5,
        closing: 5,
        empathy: 5,
        clarity: 5,
        overallScore: 5,
        feedback: 'No se pudo generar retroalimentación automática. Por favor, revisa tu conversación manualmente.',
      });
      
      setGameState('finished');
    }
  }, [
    customerProfile, 
    product, 
    conversation, 
    useVoiceAgent, 
    voiceAgentConnected,
    disconnectVoiceAgent, 
    stopTTS,
    toast
  ]);
  
  // SOLUCIÓN 3: Detener el timer cuando se está evaluando o terminado
  useEffect(() => {
    // No ejecutar el timer si estamos evaluando o ya terminamos
    if (gameState === 'evaluating' || gameState === 'finished') {
      console.log('⏸️ Timer detenido - Estado:', gameState);
      return;
    }

    if (gameState !== 'pitching' && gameState !== 'objections') {
      return;
    }

    if (timer <= 0) {
      if (gameState === 'pitching') {
        const message = 'Interesante. Pero tengo algunas dudas...';
        toast({ 
          title: 'Tiempo de Pitch terminado', 
          description: 'Ahora comienza la fase de objeciones.' 
        });
        setGameState('objections');
        setTimer(qnaDuration);
        setConversation(prev => [...prev, { sender: 'avatar', text: message }]);
        
        if (!useVoiceAgent) {
          speak(message);
        }
      } else if (gameState === 'objections') {
        console.log('⏰ Tiempo terminado - Iniciando evaluación...');
        toast({ 
          title: '¡Se acabó el tiempo!', 
          description: 'Evaluando tu pitch...' 
        });
        performEvaluation();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, timer, toast, speak, useVoiceAgent, performEvaluation, qnaDuration]);

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

  // SOLUCIÓN 4: Mostrar evaluación incluso si es parcial
  if (gameState === 'finished') {
    if (!customerProfile) {
      return (
        <div className="container mx-auto p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="mb-4">No se pudo completar la simulación correctamente.</p>
          <button
            onClick={restartPractice}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90"
          >
            Intentar de Nuevo
          </button>
        </div>
      );
    }

    if (!evaluation) {
      return (
        <div className="container mx-auto p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Procesando evaluación...</h2>
          <div className="flex justify-center mb-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          <p className="text-muted-foreground mb-4">
            Esto puede tardar unos segundos...
          </p>
          <button
            onClick={restartPractice}
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-bold hover:bg-secondary/90"
          >
            Cancelar y Volver
          </button>
        </div>
      );
    }

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

  // SOLUCIÓN 5: Mostrar estado de evaluación en SimulationView
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
      pitchDuration={pitchDuration}
      qnaDuration={qnaDuration}
    />
  );
}