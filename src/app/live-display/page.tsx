'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { WordCloudEntry, GroupNumber } from "@/types";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { WordCloudDisplay } from "@/components/competition/word-cloud";

const GROUPS: GroupNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];

export default function LiveDisplayPage() {
  const firestore = useFirestore();
  const [selectedGroup, setSelectedGroup] = useState<'general' | GroupNumber>('general');

  const wordCloudQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "wordCloud");
  }, [firestore]);

  const { data: allWords, isLoading: isLoadingWords } = useCollection<WordCloudEntry>(wordCloudQuery);

  const { generalWords, groupWords, topWord, totalWords, uniqueWords } = useMemo(() => {
    if (!allWords) {
      return { 
        generalWords: [] as { word: string; count: number }[], 
        groupWords: {} as Record<GroupNumber, { word: string; count: number }[]>,
        topWord: null as { word: string; count: number } | null,
        totalWords: 0,
        uniqueWords: 0
      };
    }

    const generalWordMap = new Map<string, number>();
    allWords.forEach(entry => {
      const word = entry.word.toLowerCase().trim();
      if (word) {
        generalWordMap.set(word, (generalWordMap.get(word) || 0) + 1);
      }
    });

    const generalWordsData = Array.from(generalWordMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);

    const groupWordsData: Record<GroupNumber, { word: string; count: number }[]> = {} as any;
    
    GROUPS.forEach(groupNum => {
      const groupWordMap = new Map<string, number>();
      
      allWords
        .filter(entry => entry.groupNumber === groupNum)
        .forEach(entry => {
          const word = entry.word.toLowerCase().trim();
          if (word) {
            groupWordMap.set(word, (groupWordMap.get(word) || 0) + 1);
          }
        });

      groupWordsData[groupNum] = Array.from(groupWordMap.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);
    });

    return { 
      generalWords: generalWordsData, 
      groupWords: groupWordsData,
      topWord: generalWordsData[0] || null,
      totalWords: allWords.length,
      uniqueWords: generalWordsData.length
    };
  }, [allWords]);

  if (isLoadingWords) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-teal-950 via-emerald-900 to-cyan-950">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-teal-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-teal-100">Cargando experiencia...</p>
          </div>
        </main>
      </div>
    );
  }

  const currentWords = selectedGroup === 'general' ? generalWords : groupWords[selectedGroup] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 via-emerald-900 to-cyan-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-lg px-6 py-3 rounded-full border border-white/20 shadow-2xl">
            <Sparkles className="h-6 w-6 text-teal-300 animate-pulse" />
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-teal-200 via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
              Live Word Cloud
            </h1>
            <Sparkles className="h-6 w-6 text-emerald-300 animate-pulse" />
          </div>
          <p className="text-teal-200 text-lg md:text-xl font-medium">
            Visualización en tiempo real • Competencia Aviva
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="group bg-gradient-to-br from-teal-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-teal-200 font-semibold text-sm uppercase tracking-wider">Total Palabras</p>
              <div className="w-10 h-10 bg-teal-400/20 rounded-full flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
            </div>
            <p className="text-5xl font-black bg-gradient-to-r from-teal-200 to-emerald-200 bg-clip-text text-transparent">
              {totalWords}
            </p>
          </div>

          <div className="group bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-200 font-semibold text-sm uppercase tracking-wider">Únicas</p>
              <div className="w-10 h-10 bg-emerald-400/20 rounded-full flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
            </div>
            <p className="text-5xl font-black bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
              {uniqueWords}
            </p>
          </div>

          <div className="group bg-gradient-to-br from-cyan-500/20 to-sky-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-cyan-200 font-semibold text-sm uppercase tracking-wider">Top Palabra</p>
              <TrendingUp className="h-5 w-5 text-cyan-300" />
            </div>
            <p className="text-3xl font-black text-cyan-100 truncate">
              {topWord?.word || '-'}
            </p>
            {topWord && (
              <p className="text-cyan-300 text-sm mt-1">
                {topWord.count} menciones
              </p>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-2 border border-white/20 shadow-2xl">
            <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
              <button
                onClick={() => setSelectedGroup('general')}
                className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                  selectedGroup === 'general'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg scale-105'
                    : 'bg-white/5 text-teal-200 hover:bg-white/10'
                }`}
              >
                General
              </button>
              {GROUPS.map(groupNum => (
                <button
                  key={groupNum}
                  onClick={() => setSelectedGroup(groupNum)}
                  className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                    selectedGroup === groupNum
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg scale-105'
                      : 'bg-white/5 text-teal-200 hover:bg-white/10'
                  }`}
                >
                  G{groupNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              {selectedGroup === 'general' ? '🌟 Todas las Palabras' : `🎯 Grupo ${selectedGroup}`}
            </h2>
            {selectedGroup !== 'general' && (
              <p className="text-teal-300">
                {currentWords.length} palabras únicas • {currentWords.reduce((sum, w) => sum + w.count, 0)} menciones totales
              </p>
            )}
          </div>
          
          <WordCloudDisplay words={currentWords} animated={true} />
        </div>

        {currentWords.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center text-white mb-6">
              🏆 Top 5 Más Mencionadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {currentWords.slice(0, 5).map((word, index) => (
                <div
                  key={word.word}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-6 border-2 border-white/30 shadow-2xl hover:scale-105 transition-transform duration-300">
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-teal-600 shadow-lg">
                      #{index + 1}
                    </div>
                    <p className="text-2xl font-black text-white mb-2 truncate">{word.word}</p>
                    <p className="text-teal-100 text-sm font-semibold">
                      {word.count} {word.count === 1 ? 'mención' : 'menciones'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}