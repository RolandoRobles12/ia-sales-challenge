"use client";

import { useEffect, useRef, useState } from "react";
import cloud from "d3-cloud";

export type WordDatum = { text: string; freq: number };

type TeamData = {
  teamName: string;
  words: WordDatum[];
  color: string;
};

type Props = {
  teams: TeamData[];
  width?: number;
  height?: number;
  maxWords?: number;
};

interface CloudWord {
  text: string;
  size: number;
  x?: number;
  y?: number;
  rotate?: number;
}

function WordCloudVisualization({ 
  words, 
  width, 
  height, 
  color 
}: { 
  words: WordDatum[]; 
  width: number; 
  height: number; 
  color: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cloudWords, setCloudWords] = useState<CloudWord[]>([]);
  const [wordFreqMap, setWordFreqMap] = useState<Map<string, number>>(new Map());
  const [minFreq, setMinFreq] = useState(1);
  const [maxFreq, setMaxFreq] = useState(1);

  useEffect(() => {
    if (words.length === 0) return;

    const sortedWords = words
      .filter((w) => w && typeof w.text === "string" && Number.isFinite(w.freq))
      .sort((a, b) => b.freq - a.freq)
      .slice(0, 100);

    if (sortedWords.length === 0) return;

    const maxF = sortedWords[0].freq;
    const minF = sortedWords[sortedWords.length - 1]?.freq || 1;
    setMaxFreq(maxF);
    setMinFreq(minF);
    
    const freqMap = new Map<string, number>();
    sortedWords.forEach(w => freqMap.set(w.text, w.freq));
    setWordFreqMap(freqMap);

    const layout = cloud()
      .size([width, height])
      .words(sortedWords.map(d => {
        const relFreq = (d.freq - minF) / (maxF - minF || 1);
        return {
          text: d.text,
          size: 20 + Math.pow(relFreq, 0.7) * 70,
        };
      }))
      .padding(5)
      .rotate(() => {
        const rand = Math.random();
        if (rand < 0.7) return 0;
        if (rand < 0.85) return -90;
        return 90;
      })
      .font('PT Sans, Arial, sans-serif')
      .fontSize(d => d.size!)
      .spiral('archimedean')
      .on('end', (computedWords: CloudWord[]) => {
        setCloudWords(computedWords);
      });

    layout.start();

    return () => {
      layout.stop();
    };
  }, [words, width, height]);

  return (
    <svg ref={svgRef} width={width} height={height}>
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        {cloudWords.map((word, i) => {
          const freq = wordFreqMap.get(word.text) || 1;
          const relFreq = (freq - minFreq) / (maxFreq - minFreq || 1);
          const opacity = 0.85 + relFreq * 0.15;
          
          return (
            <text
              key={i}
              style={{
                fontSize: word.size,
                fontFamily: 'PT Sans, Arial, sans-serif',
                fontWeight: relFreq > 0.6 ? 'bold' : '600',
                fill: color,
                opacity: opacity,
              }}
              textAnchor="middle"
              transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
            >
              {word.text}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

export default function AvivaWordCloud({ teams = [], width = 500, height = 400 }: Props) {
  const [selectedView, setSelectedView] = useState<'general' | number>('general');

  // Combinar todas las palabras para la vista general
  const allWords = teams.flatMap(team => team.words || []);
  const wordFreqMap = new Map<string, number>();
  
  allWords.forEach(word => {
    const current = wordFreqMap.get(word.text) || 0;
    wordFreqMap.set(word.text, current + word.freq);
  });

  const generalWords: WordDatum[] = Array.from(wordFreqMap.entries()).map(([text, freq]) => ({
    text,
    freq,
  }));

  const totalWords = allWords.length;
  const uniqueWords = wordFreqMap.size;

  // Si no hay equipos, mostrar mensaje
  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">No hay datos disponibles</p>
          <p className="text-gray-600">Esperando información de equipos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-10 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Nube de Palabras - Aviva</h1>
          <p className="text-lg text-emerald-50">Visualización por equipos en tiempo real</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Total Palabras</p>
                <p className="text-3xl font-bold text-gray-900">{totalWords}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-teal-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Palabras Únicas</p>
                <p className="text-3xl font-bold text-gray-900">{uniqueWords}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">Equipos</p>
                <p className="text-3xl font-bold text-gray-900">{teams.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-8 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200">
            <button
              onClick={() => setSelectedView('general')}
              className={`px-6 py-4 font-semibold transition-all ${
                selectedView === 'general'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Vista General
            </button>
            {teams.map((team, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedView(idx)}
                className={`px-6 py-4 font-semibold transition-all ${
                  selectedView === idx
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {team.teamName}
              </button>
            ))}
          </div>
        </div>

        {/* Word Cloud Display */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {selectedView === 'general' ? 'Todas las Palabras' : teams[selectedView as number]?.teamName}
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">En vivo</span>
            </div>
          </div>
          
          <div className="flex justify-center items-center bg-gradient-to-br from-gray-50 to-white rounded-xl p-8 min-h-[400px]">
            {selectedView === 'general' ? (
              <WordCloudVisualization
                words={generalWords}
                width={width}
                height={height}
                color="#00664F"
              />
            ) : (
              <WordCloudVisualization
                words={teams[selectedView as number]?.words || []}
                width={width}
                height={height}
                color={teams[selectedView as number]?.color || '#00664F'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}