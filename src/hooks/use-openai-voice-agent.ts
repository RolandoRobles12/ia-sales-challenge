'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  console.log('🔧 Hook inicializado - isListening:', state.isListening);

  const getInstructions = useCallback(() => {
    const modeDetails = {
      Curioso: 'abierto, con interés genuino',
      Desconfiado: 'frío, dudoso, busca defectos',
      Apurado: 'cortante, con prisa, quiere lo esencial',
    };

    return `# Personality and Tone
## Identity
Eres un **cliente potencial de Aviva Crédito en México** interesado en ${product}.
Tu perfil: persona de ingresos limitados, microempresario o trabajador que busca crédito personal, para negocio o para mejorar su casa.
No eres asesor ni vendedor: **solo cliente** que escucha y responde.
Siempre hablas como un cliente de Aviva que duda, pregunta y quiere respuestas claras.

## Task
Tu única tarea es actuar como **cliente real de Aviva** durante un pitch de ventas:
- Escucha lo que dice el vendedor.
- Responde con frases cortas y realistas, como en una plática normal (máx. 2 oraciones, ≤25 palabras).
- Haz **preguntas concretas y objeciones comunes**:
  - "¿Y cuánto tengo que pagar cada semana?"
  - "Eso suena caro."
  - "No confío, ya tuve malas experiencias."
  - "No tengo tiempo, dímelo rápido."
- Cada **2–3 turnos** introduce una objeción nueva.
- Si el vendedor habla mucho, interrúmpelo: "Perdón, pero dime lo importante."
- Al acercarse el final, exige: "Dame tu propuesta concreta para decidir hoy."

## Demeanor
Natural y humano, como cliente en la calle.

## Tone
Conversacional, directo, sin tecnicismos financieros.

## Level of Enthusiasm
**${mode}** → ${modeDetails[mode]}.

## Level of Formality
Casual-profesional. Usa "tú".

## Level of Emotion
Moderado: interés, duda o prisa según el modo.

## Filler Words
Occasionally: "mmm", "eh", "ok" para sonar natural.

## Pacing
Frases cortas, ≤10 segundos de voz. Pausas naturales.

## Other details
- Nunca des tasas, montos exactos ni requisitos formales.
- Siempre actúa como **cliente mexicano de Aviva**.
- Si el vendedor intenta darte datos personales o te pide información sensible, responde: "Prefiero no dar datos, solo dime lo general."
- Si el vendedor insiste demasiado, di: "No me convences, ¿qué otra ventaja tienes?"

# Instructions
- Si el usuario menciona nombre, teléfono u otro dato exacto, repítelo para confirmar.
- Si el usuario corrige algo, reconoce la corrección y confirma el nuevo valor.

IMPORTANTE: El usuario es el VENDEDOR. Tú eres el CLIENTE evaluando ${product}.`;
  }, [product, mode]);

  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnected: false, error: null }));
      console.log('🔄 Iniciando conexión con OpenAI Realtime API (WebRTC)...');

      // Paso 1: Obtener ephemeral token
      const tokenResponse = await fetch('/api/openai/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: getInstructions(),
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'No se pudo crear la sesión');
      }

      const { ephemeral_token } = await tokenResponse.json();
      console.log('✅ Token efímero obtenido');

      // Paso 2: Crear PeerConnection con configuración específica
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Configurar micrófono con restricciones específicas
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
      
      // Agregar el track de audio con etiqueta específica
      const audioTrack = stream.getAudioTracks()[0];
      console.log('🎤 Track de audio:', {
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
        settings: audioTrack.getSettings(),
      });
      
      // Verificar nivel de audio
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const checkAudioLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average > 5) {
          console.log('🎤 Audio detectado en el micrófono - Nivel:', Math.round(average));
        }
      };
      
      // Verificar nivel de audio cada segundo
      const audioCheckInterval = setInterval(checkAudioLevel, 1000);
      
      // Limpiar después de 10 segundos
      setTimeout(() => {
        clearInterval(audioCheckInterval);
        console.log('✅ Monitor de audio desactivado');
      }, 10000);
      
      pc.addTrack(audioTrack, stream);
      console.log('✅ Micrófono configurado y agregado a PeerConnection');

      // Configurar audio de salida
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.id = 'openai-audio-output';
      audioElementRef.current = audioEl;
      document.body.appendChild(audioEl);

      pc.ontrack = (e) => {
        console.log('🔊 Track de audio recibido:', {
          kind: e.track.kind,
          streams: e.streams.length,
        });
        
        if (e.track.kind === 'audio') {
          audioEl.srcObject = e.streams[0];
          console.log('✅ Audio conectado al elemento de reproducción');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🔗 ICE Connection State:', pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection State:', pc.connectionState);
      };

      // Configurar data channel para eventos ANTES de crear la oferta
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.addEventListener('open', () => {
        console.log('✅ Data channel abierto - Enviando configuración');
        
        // Configurar la sesión inmediatamente
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: getInstructions(),
            voice: 'verse',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: null, // Desactivar VAD - modo manual
            temperature: 0.8,
            max_response_output_tokens: 4096,
          },
        };

        console.log('📤 Enviando configuración completa:', JSON.stringify(sessionConfig, null, 2));
        dc.send(JSON.stringify(sessionConfig));
      });

      dc.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data);
          
          // Log todos los eventos excepto deltas de audio
          if (!event.type.includes('.delta') && event.type !== 'input_audio_buffer.append') {
            console.log('📨 Evento:', event.type, event);
          }
          
          switch (event.type) {
            case 'session.created':
              console.log('✅ Sesión creada:', event.session?.id);
              break;

            case 'session.updated':
              console.log('✅ Sesión actualizada - VAD activo');
              setState(prev => ({ ...prev, isConnected: true }));
              break;

            case 'input_audio_buffer.speech_started':
              console.log('🎤 🎤 🎤 DETECTADO: Usuario empezó a hablar');
              setState(prev => ({ ...prev, isListening: true }));
              break;

            case 'input_audio_buffer.speech_stopped':
              console.log('🎤 DETECTADO: Usuario dejó de hablar');
              setState(prev => ({ ...prev, isListening: false }));
              break;

            case 'input_audio_buffer.committed':
              console.log('✅ ✅ Audio confirmado - buffer listo para procesar');
              break;

            case 'conversation.item.created':
              if (event.item?.type === 'message' && event.item?.role === 'user') {
                console.log('💬 Mensaje del usuario registrado en la conversación');
              }
              if (event.item?.type === 'message' && event.item?.role === 'assistant') {
                console.log('💬 El agente está preparando su respuesta...');
              }
              break;

            case 'conversation.item.input_audio_transcription.completed':
              console.log('📝 📝 📝 TRANSCRIPCIÓN:', event.transcript);
              if (event.transcript && onMessage) {
                onMessage(event.transcript, true);
              }
              break;

            case 'response.created':
              console.log('🤖 Generando respuesta...');
              setState(prev => ({ ...prev, isSpeaking: true }));
              break;

            case 'response.audio_transcript.delta':
              if (event.delta && onMessage) {
                onMessage(event.delta, false);
              }
              break;

            case 'response.audio_transcript.done':
              console.log('🤖 🤖 🤖 RESPUESTA:', event.transcript);
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

      // Paso 3: Crear oferta SDP
      console.log('📝 Creando oferta SDP...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('✅ Oferta SDP creada y establecida localmente');

      // Paso 4: Enviar oferta a OpenAI
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

      // Paso 5: Aplicar respuesta SDP
      const answerSdp = await sdpResponse.text();
      console.log('📥 Respuesta SDP recibida');
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      console.log('✅ ✅ ✅ Conexión WebRTC establecida completamente');
      console.log('🎯 🎯 🎯 El agente está listo. HABLA AHORA y verás los eventos.');
      console.log('💡 Tip: Habla claro y espera a que el micrófono detecte tu voz.');

    } catch (error) {
      console.error('❌ Error conectando:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({
        ...prev,
        error: error as Error,
        isConnected: false,
      }));
      toast({
        variant: 'destructive',
        title: 'Error de inicialización',
        description: errorMessage,
      });
    }
  }, [getInstructions, onMessage, toast]);

  const startListening = useCallback(() => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      console.log('🎤 🎤 🎤 Iniciando captura de audio (presionando botón)...');
      setState(prev => ({ ...prev, isListening: true }));
      
      // No necesitamos enviar nada, el audio ya está fluyendo
      // Solo cambiamos el estado visual
    }
  }, []);

  const stopListening = useCallback(() => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      console.log('🎤 Botón soltado - Procesando audio capturado...');
      
      // Enviar comando para confirmar el audio del buffer
      dataChannelRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
      
      console.log('📤 Solicitando respuesta del agente...');
      // Solicitar que el agente genere una respuesta
      dataChannelRef.current.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Responde al vendedor como cliente de Aviva, siguiendo tu personalidad y tono establecidos.',
        }
      }));
      
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando...');
    
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

  useEffect(() => {
    return () => {
      disconnect();
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