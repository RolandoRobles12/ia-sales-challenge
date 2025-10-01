"use client";

import { useEffect, useMemo, useState } from "react";
import AvivaWordCloud, { WordDatum } from "@/components/AvivaWordCloud";
import { useFirestore } from "@/firebase";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

export default function LiveDisplayPage() {
  const firestore = useFirestore();
  const [words, setWords] = useState<WordDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) return;
    
    // ✅ CORRECCIÓN 1: Nombre correcto de la colección
    const q = collection(firestore, "wordCloud");

    const unsub = onSnapshot(
      q,
      (snap) => {
        // ✅ CORRECCIÓN 2: Agregar las palabras por frecuencia
        const wordFrequency: Record<string, number> = {};
        
        snap.forEach((doc) => {
          const data = doc.data();
          // Normalizar la palabra (minúsculas, sin espacios extra)
          const word = String(data?.word ?? "").trim().toLowerCase();
          
          if (word) {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
          }
        });

        // Convertir a formato esperado por el componente
        const wordData: WordDatum[] = Object.entries(wordFrequency)
          .map(([text, freq]) => ({ text, freq }))
          .sort((a, b) => b.freq - a.freq) // Ordenar por frecuencia
          .slice(0, 300); // Limitar a 300 palabras

        setWords(wordData);
        setLoading(false);
      },
      (e) => {
        setErr(e?.message ?? "Error cargando datos");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firestore]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[500px]">
          <span className="text-sm opacity-70">Cargando nube de palabras…</span>
        </div>
      );
    }
    if (err) {
      return (
        <div className="p-4 text-red-600">
          Error: {err}
        </div>
      );
    }
    if (!words.length) {
      return (
        <div className="flex items-center justify-center h-[500px]">
          <span className="text-sm opacity-70">
            No hay palabras disponibles aún.
          </span>
        </div>
      );
    }
    return <AvivaWordCloud words={words} width={1100} height={600} maxWords={200} />;
  }, [loading, err, words]);

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-semibold mb-4">Live Display - Word Cloud</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        {content}
      </div>
      
      {/* Debug info - remover en producción */}
      {!loading && !err && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Total de palabras únicas: {words.length}</p>
          <p>Total de entradas: {words.reduce((sum, w) => sum + w.freq, 0)}</p>
        </div>
      )}
    </main>
  );
}