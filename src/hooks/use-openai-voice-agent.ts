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

    return `IMPORTANTE: TÚ ERES EL CLIENTE. EL USUARIO QUE TE HABLA ES EL VENDEDOR.

# Tu Rol
Eres un **cliente mexicano** que está considerando ${product} de Aviva Crédito.
- Perfil: microempresario o trabajador con ingresos limitados
- El usuario que te habla es el VENDEDOR que intenta convencerte
- Tu trabajo es ESCUCHAR su pitch y RESPONDER como cliente real

# Cómo actuar
1. ESCUCHA lo que el vendedor (el usuario) te dice
2. RESPONDE de forma breve (máximo 2 oraciones, 25 palabras)
3. HAZ preguntas y objeciones realistas:
   - "¿Cuánto tengo que pagar cada semana?"
   - "Suena caro. ¿Hay algo más barato?"
   - "No confío en esto, ya me han estafado antes"
   - "No tengo tiempo, dime lo importante"
4. NUNCA actúes como vendedor o asesor
5. NUNCA des información sobre productos, tasas o procesos
6. Solo PREGUNTA y OBJETA como lo haría un cliente real

# Tu personalidad: ${mode}
${modeDetails[mode]}

# Ejemplo de conversación correcta:
Vendedor (usuario): "Buenos días, le presento Aviva Contigo, un crédito..."
Tú (cliente): "Mmm, ¿y cuánto me cuesta eso?"

Vendedor (usuario): "Las tasas son muy competitivas..."
Tú (cliente): "Eso no me dice nada. Dame números reales."

RECUERDA: Tú eres el CLIENTE. El usuario es el VENDEDOR. Solo escucha y responde.`;
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

      // Get ephemeral token
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

      // Create PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Setup microphone
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
      pc.addTrack(audioTrack, stream);
      console.log('✅ Micrófono configurado');

      // Setup audio output
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.id = 'openai-audio-output';
      audioElementRef.current = audioEl;
      document.body.appendChild(audioEl);

      pc.ontrack = (e) => {
        if (e.track.kind === 'audio') {
          audioEl.srcObject = e.streams[0];
          console.log('✅ Audio conectado');
        }
      };

      // Create data channel BEFORE creating offer
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.addEventListener('open', () => {
        console.log('✅ Data channel abierto');
        
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions,
            voice: 'marin',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: null,
            temperature: 0.8,
            max_response_output_tokens: 4096,
          },
        };

        dc.send(JSON.stringify(sessionConfig));
      });

      dc.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data);
          
          switch (event.type) {
            case 'session.updated':
              setState(prev => ({ ...prev, isConnected: true }));
              isConnectingRef.current = false;
              console.log('✅ Sesión actualizada - Listo para usar');
              break;

            case 'input_audio_buffer.speech_started':
              setState(prev => ({ ...prev, isListening: true }));
              break;

            case 'input_audio_buffer.speech_stopped':
              setState(prev => ({ ...prev, isListening: false }));
              break;

            case 'conversation.item.input_audio_transcription.completed':
              if (event.transcript && onMessageRef.current) {
                onMessageRef.current(event.transcript, true);
              }
              break;

            case 'response.created':
              setState(prev => ({ ...prev, isSpeaking: true }));
              break;

            case 'response.audio_transcript.delta':
              if (event.delta && onMessageRef.current) {
                onMessageRef.current(event.delta, false);
              }
              break;

            case 'response.done':
              setState(prev => ({ ...prev, isSpeaking: false }));
              break;

            case 'error':
              console.error('❌ ERROR:', event.error);
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

      // Create and send SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeral_token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error(`Error en handshake SDP: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      console.log('✅ Conexión establecida');

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
      setState(prev => ({ ...prev, isListening: true }));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
      
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