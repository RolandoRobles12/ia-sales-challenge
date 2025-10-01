"use client";

import { useEffect, useRef } from "react";

export type WordDatum = { text: string; freq: number };

type Props = {
  words: WordDatum[];
  width?: number;
  height?: number;
  maxWords?: number;
};

export default function AvivaWordCloud({
  words,
  width = 900,
  height = 500,
  maxWords = 200,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === "undefined") return; // evita SSR
      // Import dinámico: esta librería toca window
      const mod: any = await import("wordcloud");
      const WordCloud = mod.default ?? mod;

      if (cancelled || !canvasRef.current) return;

      const list = words
        .filter((w) => w && typeof w.text === "string" && Number.isFinite(w.freq))
        .sort((a, b) => b.freq - a.freq)
        .slice(0, maxWords)
        .map((w) => [w.text, w.freq]) as [string, number][];

      WordCloud(canvasRef.current, {
        list,
        drawOutOfBound: false,
        shrinkToFit: true,
        rotateRatio: 0,
        // Ajusta el factor de peso si quieres que crezca más/agresivo
        weightFactor: (freq: number) => {
          // mapea frecuencia → tamaño (px)
          const min = 12;
          const max = 64;
          const maxFreq = list.length ? list[0][1] : 1;
          const rel = Math.max(0.05, Math.min(1, freq / maxFreq));
          return Math.round(min + rel * (max - min));
        },
        // Opcional: acelerar forma
        // gridSize: 6,
        // backgroundColor: "#ffffff",
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [words, maxWords]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}