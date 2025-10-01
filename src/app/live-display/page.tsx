"use client";

import { useEffect, useMemo, useState } from "react";
import AvivaWordCloud, { WordDatum } from "@/components/AvivaWordCloud";
import { db } from "@/config/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit as qLimit,
} from "firebase/firestore";

export default function LiveDisplayPage() {
  const [words, setWords] = useState<WordDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Cambia "wordcloud" por la colección que estés usando realmente
    // Estructura esperada del doc: { text: string, freq: number }
    const q = query(
      collection(db, "wordcloud"),
      orderBy("freq", "desc"),
      qLimit(300)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: WordDatum[] = [];
        snap.forEach((doc) => {
          const d = doc.data() as any;
          const text = String(d?.text ?? "").trim();
          const freq = Number(d?.freq ?? 0);
          if (text && Number.isFinite(freq) && freq > 0) {
            next.push({ text, freq });
          }
        });
        setWords(next);
        setLoading(false);
      },
      (e) => {
        setErr(e?.message ?? "Error cargando datos");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

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
      <h1 className="text-2xl font-semibold mb-4">Live Display</h1>
      {content}
    </main>
  );
}