'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// A simple sentence tokenizer
const getSentences = (text: string): string[] => {
  if (!text) return [];
  // Basic sentence splitting. It may not be perfect for all cases.
  const sentences = text.match(/[^.!?]+[.!?]+|\s/g);
  return sentences ? sentences.map(s => s.trim()).filter(Boolean) : [text];
};

export default function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const sentenceQueue = useRef<string[]>([]);
  const textBuffer = useRef<string>('');

  const updateVoices = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Immediately check for voices
      updateVoices();
      // Subscribe to changes
      window.speechSynthesis.onvoiceschanged = updateVoices;
      
      // Cleanup function to prevent memory leaks and stop any ongoing speech
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      };
    }
  }, [updateVoices]);

  const processQueue = useCallback(() => {
    // Only process if not already speaking and there are sentences in the queue
    if (sentenceQueue.current.length > 0 && !window.speechSynthesis.speaking) {
      const text = sentenceQueue.current.shift();
      
      // Ensure text is not empty, undefined, or just whitespace before speaking
      if (!text || !text.trim()) {
        if (sentenceQueue.current.length > 0) {
          processQueue(); // Try next item in queue
        } else {
          setIsSpeaking(false);
        }
        return;
      }
      
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      const mexicanVoice = voices.find(voice => voice.lang === 'es-MX');
      const spanishVoice = voices.find(voice => voice.lang.startsWith('es-')) || voices.find(voice => voice.lang.startsWith('es'));
      utterance.voice = mexicanVoice || spanishVoice || null;
      
      utterance.onend = () => {
        if (sentenceQueue.current.length > 0) {
          processQueue();
        } else {
          setIsSpeaking(false);
        }
      };
      
      utterance.onerror = (e) => {
        // Avoid logging common, non-critical errors.
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error("SpeechSynthesis Error", e);
        }
        setIsSpeaking(false);
        sentenceQueue.current = []; // Clear queue on error to prevent loops
      };
      
      window.speechSynthesis.speak(utterance);
    }
  }, [voices]); // Depend on voices to ensure they are loaded

  const speak = useCallback((text: string, isChunk = false) => {
    // Guard against running on server or if API/voices are not ready
    if (typeof window === 'undefined' || !window.speechSynthesis || !text || voices.length === 0) return;

    if (isChunk) {
      textBuffer.current += text;
      const sentences = getSentences(textBuffer.current);
      if (sentences.length > 1) {
        const toQueue = sentences.slice(0, -1);
        sentenceQueue.current.push(...toQueue);
        textBuffer.current = sentences[sentences.length - 1];
        if (!isSpeaking) {
          processQueue();
        }
      }
    } else {
      // If it's not a chunk, clear previous state and speak
      window.speechSynthesis.cancel();
      sentenceQueue.current = getSentences(text); // Tokenize the full text
      textBuffer.current = '';
      processQueue();
    }
  }, [voices, isSpeaking, processQueue]);
  
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      sentenceQueue.current = [];
      textBuffer.current = '';
      setIsSpeaking(false);
    }
  }, []);

  return { isSpeaking, speak, stop };
}
