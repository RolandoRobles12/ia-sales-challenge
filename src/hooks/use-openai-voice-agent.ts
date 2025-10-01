'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useToast } from './use-toast';
import type { Product, Mode } from '@/types';

interface UseOpenAIVoiceAgentOptions {
  product: Product;
  mode: Mode;
  onMessage?: (message: string, isUser: boolean) => void;
}

interface VoiceAgentState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  error: Error | null;
}

export default function useOpenAIVoiceAgent({
  product,
  mode,
  onMessage,
}: UseOpenAIVoiceAgentOptions) {
  const [state, setState] = useState<VoiceAgentState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    error: null,
  });

  const { toast } = useToast();
  
  // Use refs to avoid recreating callbacks
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const onMessageRef = useRef(onMessage);
  const isConnectingRef = useRef(false); // Prevent duplicate connections
  
  // Keep onMessage ref updated without causing re-renders
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Memoize instructions to prevent recreation
  const instructions = useMemo(() => {
    const modeDetails = {
      Curioso: 'abierto, con interés genuino',
      Desconfiado: 'frío, dudoso, busca defectos',
      Apurado: 'cortante, con prisa, quiere lo esencial',
    };

    return `# CRITICAL RULE - READ THIS FIRST
YOU ARE THE CUSTOMER. The user speaking to you is THE SALESPERSON.
NEVER act as a salesperson or advisor. NEVER offer help or information about products.
ALWAYS respond in SPANISH (español mexicano).

# Your Identity
You are a potential Mexican customer considering "${product}" from Aviva Crédito.
- Profile: Small business owner or worker with limited income
- The USER is trying to SELL to YOU
- Your job: LISTEN to their pitch and RESPOND as a real skeptical customer would
- Language: ALWAYS speak in Spanish (Mexico)

# How to Act
1. LISTEN to what the salesperson (user) tells you
2. RESPOND briefly in SPANISH (max 2 sentences, 25 words)
3. ASK questions and raise realistic objections in SPANISH:
   - "¿Cuánto cuesta exactamente?"
   - "Suena muy caro"
   - "No confío en esto"
   - "No tengo tiempo, rápido"
4. NEVER act as advisor/helper
5. NEVER provide product information or explain processes
6. ONLY ask questions and object like a real Mexican customer

# Your Personality: ${mode}
${modeDetails[mode]}

# WRONG Examples (DO NOT DO THIS):
❌ User: "Hola"
❌ You: "Hola, ¿qué me ofreces? ¿Puedo ayudarte?" ← WRONG! You're acting as helper
❌ You: "Thank you very much" ← WRONG! Always Spanish
❌ You: "그만" ← WRONG! Always Spanish

# CORRECT Examples:
✅ User: "Le presento Aviva Contigo..."
✅ You: "¿Y eso cuánto cuesta?"

✅ User: "Las tasas son competitivas..."
✅ You: "No entiendo, dame números reales"

✅ User: "Gracias por su tiempo"
✅ You: "Ok, gracias"

REMEMBER: 
- You are the CUSTOMER being sold to
- The user is the SALESPERSON
- ALWAYS respond in Spanish (México)
- React naturally to their pitch with questions and doubts`;
  }, [product, mode]);

  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando...');
    
    // Reset connection flag
    isConnectingRef.current = false;
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setState({
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      error: null,
    });
  }, []);

  const connect = useCallback(async () => {
    // Prevent duplicate connections
    if (isConnectingRef.current || peerConnectionRef.current) {
      console.log('⚠️ Conexión ya en progreso o activa, ignorando...');
      return;
    }

    isConnectingRef.current = true;

    try {
      setState(prev => ({ ...prev, isConnected: false, error: null }));
      console.log('🔄 Iniciando conexión con OpenAI Realtime API (WebRTC)...');

      // Paso 1: Get ephemeral token
      const tokenResponse = await fetch('/api/openai/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'No se pudo crear la sesión');
      }

      const { ephemeral_token } = await tokenResponse.json();
      console.log('✅ Token efímero obtenido');

      // Paso 2: Create PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Paso 3: Setup microphone
      console.log('🎤 Solicitando acceso al micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1,
        }
      });
      
      const audioTrack = stream.getAudioTracks()[0];
      console.log('🎤 Track de audio configurado:', {
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        settings: audioTrack.getSettings(),
      });
      
      pc.addTrack(audioTrack, stream);
      console.log('✅ Micrófono agregado a PeerConnection');

      // Paso 4: Setup audio output
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.id = 'openai-audio-output';
      audioElementRef.current = audioEl;
      document.body.appendChild(audioEl);

      pc.ontrack = (e) => {
        console.log('🔊 Track recibido:', e.track.kind);
        if (e.track.kind === 'audio') {
          audioEl.srcObject = e.streams[0];
          console.log('✅ Audio de salida conectado');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🔗 ICE Connection State:', pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection State:', pc.connectionState);
      };

      // Paso 5: Create data channel BEFORE creating offer
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.addEventListener('open', () => {
        console.log('✅ Data channel abierto - Enviando configuración');
        
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions,
            voice: 'marin',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
            temperature: 0.8,
            max_response_output_tokens: 150, // Limitar respuestas cortas
          },
        };

        console.log('📤 Configuración enviada');
        dc.send(JSON.stringify(sessionConfig));
      });

      dc.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data);
          
          // Log solo eventos importantes (no deltas)
          if (!event.type.includes('.delta') && event.type !== 'input_audio_buffer.append') {
            console.log('📨 Evento:', event.type);
          }
          
          switch (event.type) {
            case 'session.created':
              console.log('✅ Sesión creada:', event.session?.id);
              break;

            case 'session.updated':
              console.log('✅ Sesión actualizada - Listo para usar');
              setState(prev => ({ ...prev, isConnected: true }));
              isConnectingRef.current = false;
              break;

            case 'input_audio_buffer.speech_started':
              console.log('🎤 Usuario empezó a hablar');
              setState(prev => ({ ...prev, isListening: true }));
              break;

            case 'input_audio_buffer.speech_stopped':
              console.log('🎤 Usuario dejó de hablar');
              setState(prev => ({ ...prev, isListening: false }));
              break;

            case 'input_audio_buffer.committed':
              console.log('✅ Audio confirmado');
              break;

            case 'conversation.item.created':
              if (event.item?.role === 'user') {
                console.log('💬 Mensaje del usuario registrado');
              } else if (event.item?.role === 'assistant') {
                console.log('💬 El agente preparando respuesta...');
              }
              break;

            case 'conversation.item.input_audio_transcription.completed':
              console.log('📝 Transcripción:', event.transcript);
              if (event.transcript && onMessageRef.current) {
                onMessageRef.current(event.transcript, true);
              }
              break;

            case 'response.created':
              console.log('🤖 Generando respuesta...');
              setState(prev => ({ ...prev, isSpeaking: true }));
              break;

            case 'response.audio_transcript.delta':
              if (event.delta && onMessageRef.current) {
                onMessageRef.current(event.delta, false);
              }
              break;

            case 'response.audio_transcript.done':
              console.log('🤖 Respuesta completa:', event.transcript);
              break;

            case 'response.done':
              console.log('✅ Respuesta completada');
              setState(prev => ({ ...prev, isSpeaking: false }));
              break;

            case 'error':
              console.error('❌ ERROR del agente:', event.error);
              toast({
                variant: 'destructive',
                title: 'Error del agente',
                description: event.error?.message || 'Error desconocido',
              });
              break;
          }
        } catch (error) {
          console.error('❌ Error procesando evento:', error);
        }
      });

      dc.addEventListener('error', (error) => {
        console.error('❌ Error en data channel:', error);
      });

      // Paso 6: Create and send SDP offer
      console.log('📝 Creando oferta SDP...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('✅ Oferta SDP establecida localmente');

      console.log('📤 Enviando oferta a OpenAI...');
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeral_token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('❌ Error en handshake SDP:', errorText);
        throw new Error(`Error en handshake SDP: ${sdpResponse.status}`);
      }

      // Paso 7: Apply SDP answer
      const answerSdp = await sdpResponse.text();
      console.log('📥 Respuesta SDP recibida');
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      console.log('✅ ✅ ✅ Conexión WebRTC establecida completamente');
      console.log('🎯 El agente está listo - Presiona el botón para hablar');

    } catch (error) {
      console.error('❌ Error conectando:', error);
      isConnectingRef.current = false;
      
      setState(prev => ({
        ...prev,
        error: error as Error,
        isConnected: false,
      }));
      
      toast({
        variant: 'destructive',
        title: 'Error de conexión',
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
      
      // Cleanup on error
      disconnect();
    }
  }, [instructions, toast, disconnect]);

  const startListening = useCallback(() => {
    if (dataChannelRef.current?.readyState === 'open') {
      console.log('🎤 Iniciando captura (botón presionado)');
      setState(prev => ({ ...prev, isListening: true }));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (dataChannelRef.current?.readyState === 'open') {
      console.log('🎤 Botón soltado - Procesando audio...');
      
      // Confirmar el audio capturado
      dataChannelRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
      
      console.log('📤 Solicitando respuesta del agente...');
      // Solicitar respuesta
      dataChannelRef.current.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
        }
      }));
      
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, []);

  // Cleanup on unmount OR when component is about to be replaced by HMR
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        console.log('🧹 Limpiando conexiones (unmount/HMR)');
        disconnect();
      }
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    startListening,
    stopListening,
  };
}