"use client";

import { useEffect, useRef, useState } from "react";
import cloud from "d3-cloud";

export type WordDatum = { text: string; freq: number };

type Props = {
  words: WordDatum[];
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

export default function AvivaWordCloud({
  words,
  width = 800,
  height = 800,
  maxWords = 100,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cloudWords, setCloudWords] = useState<CloudWord[]>([]);
  const [maskReady, setMaskReady] = useState(false);
  const [minFreq, setMinFreq] = useState(1);
  const [maxFreq, setMaxFreq] = useState(1);
  const [wordFreqMap, setWordFreqMap] = useState<Map<string, number>>(new Map());

  // Crear la máscara del logo
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Fondo negro (área prohibida)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 600;

    // Dibujar el logo en blanco (área permitida)
    ctx.fillStyle = '#FFFFFF';
    
    // Cuadro redondeado principal
    const size = 450 * scale;
    const radius = 90 * scale;
    const x = centerX - size / 2;
    const y = centerY - size / 2;
    
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, radius);
    ctx.fill();

    // Guardar el canvas como máscara
    (window as any).__maskCanvas = canvas;
    setMaskReady(true);
  }, [width, height]);

  // Generar el word cloud cuando las palabras cambien
  useEffect(() => {
    if (!maskReady || words.length === 0) return;

    const sortedWords = words
      .filter((w) => w && typeof w.text === "string" && Number.isFinite(w.freq))
      .sort((a, b) => b.freq - a.freq)
      .slice(0, maxWords);

    if (sortedWords.length === 0) return;

    const maxF = sortedWords[0].freq;
    const minF = sortedWords[sortedWords.length - 1]?.freq || 1;
    setMaxFreq(maxF);
    setMinFreq(minF);
    
    // Guardar el mapa de frecuencias
    const freqMap = new Map<string, number>();
    sortedWords.forEach(w => freqMap.set(w.text, w.freq));
    setWordFreqMap(freqMap);

    // Función para verificar si un punto está en la máscara
    const maskCanvas = (window as any).__maskCanvas as HTMLCanvasElement;
    const maskCtx = maskCanvas?.getContext('2d');
    
    const isInMask = (x: number, y: number): boolean => {
      if (!maskCtx) return true;
      
      const px = Math.floor(x + width / 2);
      const py = Math.floor(y + height / 2);
      
      if (px < 0 || px >= width || py < 0 || py >= height) return false;
      
      const pixel = maskCtx.getImageData(px, py, 1, 1).data;
      return pixel[0] > 128; // Blanco = permitido
    };

    const layout = cloud()
      .size([width, height])
      .words(sortedWords.map(d => {
        const relFreq = (d.freq - minF) / (maxF - minF || 1);
        return {
          text: d.text,
          size: 24 + Math.pow(relFreq, 0.7) * 96, // 24px a 120px con curva
        };
      }))
      .padding(5)
      .rotate(() => {
        const rand = Math.random();
        if (rand < 0.7) return 0; // 70% horizontal
        if (rand < 0.85) return -90; // 15% vertical izquierda
        return 90; // 15% vertical derecha
      })
      .font('PT Sans, Arial, sans-serif')
      .fontSize(d => d.size!)
      .spiral('rectangular') // Mejor distribución
      // Función personalizada para verificar la máscara
      .on('word', (word: CloudWord) => {
        // Verificar si la palabra cabe en la máscara
        if (word.x !== undefined && word.y !== undefined) {
          const inMask = isInMask(word.x, word.y);
          if (!inMask) {
            // Si no está en la máscara, intentar otra posición
            return false;
          }
        }
      })
      .on('end', (computedWords: CloudWord[]) => {
        // Filtrar palabras que están fuera de la máscara
        const filteredWords = computedWords.filter(word => {
          if (word.x === undefined || word.y === undefined) return false;
          return isInMask(word.x, word.y);
        });
        setCloudWords(filteredWords);
      });

    layout.start();

    return () => {
      layout.stop();
    };
  }, [words, width, height, maxWords, maskReady]);

  return (
    <div className="relative inline-block bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* SVG para el logo de fondo */}
      <svg width={width} height={height} className="absolute inset-0" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0,300) scale(0.1,-0.1)" fill="#00664F" stroke="none">
          <path d="M380 2967 c-164 -56 -299 -192 -350 -356 -21 -66 -27 -143 -11 -125 5 5 21 46 36 91 32 101 84 182 160 251 67 62 122 91 222 121 40 12 75 26 78 31 11 18 -68 10 -135 -13z"/>
          <path d="M2484 2982 c4 -7 33 -19 64 -28 111 -32 183 -74 258 -148 78 -78 111 -133 144 -246 12 -41 26 -79 31 -84 17 -18 10 70 -11 135 -47 151 -163 277 -316 345 -61 27 -182 45 -170 26z"/>
          <path d="M1405 2649 c-176 -7 -277 -20 -345 -44 -143 -50 -269 -159 -332 -285 -69 -136 -72 -162 -63 -535 3 -181 8 -332 10 -335 1 -3 6 -95 10 -205 9 -263 28 -436 55 -507 72 -193 229 -313 478 -368 99 -22 395 -27 513 -10 237 36 400 136 494 305 59 104 77 222 90 580 3 88 8 185 10 215 12 153 16 640 7 690 -40 213 -186 384 -385 451 -33 11 -78 22 -100 25 -23 3 -49 7 -57 10 -8 3 -58 8 -110 10 -52 3 -99 6 -105 7 -5 1 -82 -1 -170 -4z m380 -49 c105 -15 153 -29 227 -68 86 -44 146 -97 197 -172 48 -73 79 -152 90 -234 15 -109 -24 -1114 -50 -1286 -30 -199 -200 -369 -424 -425 -193 -47 -497 -45 -670 6 -216 64 -372 221 -405 409 -19 107 -48 735 -52 1135 -2 139 1 181 16 230 60 201 215 346 416 389 41 9 113 20 160 26 100 10 395 5 495 -10z"/>
          <path d="M1350 2324 c-256 -28 -339 -60 -435 -165 -53 -58 -81 -104 -105 -175 -21 -61 -29 -154 -9 -104 39 96 76 154 131 205 95 88 165 115 348 136 118 13 427 7 528 -11 194 -33 301 -124 391 -330 10 -21 11 -15 7 32 -8 107 -97 247 -200 317 -59 40 -119 61 -216 77 -84 14 -372 26 -440 18z m376 -53 c15 -10 7 -11 -46 -6 -97 9 -318 6 -407 -5 -43 -6 -96 -12 -118 -15 l-40 -4 36 13 c20 8 74 17 120 21 46 4 86 9 89 11 10 11 347 -3 366 -15z m152 -27 c31 -12 32 -13 7 -8 -16 3 -50 8 -75 11 -25 3 -49 10 -55 15 -14 14 75 1 123 -18z"/>
          <path d="M1300 2024 c-155 -24 -200 -43 -254 -106 -64 -74 -68 -104 -56 -428 16 -435 29 -608 49 -655 24 -54 86 -108 153 -133 148 -56 466 -56 616 0 72 27 146 97 160 153 14 53 30 286 42 634 12 323 8 355 -56 429 -49 57 -101 82 -209 98 -81 13 -380 17 -445 8z m450 -45 c85 -12 147 -43 183 -92 46 -61 50 -91 43 -346 -4 -130 -9 -258 -11 -286 -2 -27 -7 -104 -10 -170 -3 -66 -8 -140 -11 -165 -13 -100 -76 -164 -194 -197 -84 -23 -404 -26 -490 -4 -138 36 -194 98 -206 233 -3 34 -7 83 -9 108 -8 76 -20 467 -20 620 0 134 2 148 23 182 33 54 76 86 138 104 104 30 396 37 564 13z"/>
          <path d="M1430 1778 c-41 -11 -84 -49 -100 -89 -19 -45 -9 -172 16 -206 32 -43 80 -63 154 -63 116 0 171 46 178 150 2 32 1 75 -2 94 -8 42 -49 94 -85 108 -36 14 -119 17 -161 6z m155 -42 c46 -20 59 -49 59 -137 1 -119 -25 -144 -150 -144 -101 0 -130 27 -140 123 -8 80 11 132 56 154 42 22 128 23 175 4z"/>
          <path d="M2979 525 c-4 -5 -19 -50 -34 -98 -15 -48 -44 -114 -65 -145 -35 -54 -117 -142 -132 -142 -3 0 -13 -6 -20 -14 -23 -23 -154 -81 -188 -84 -3 0 -21 -7 -40 -15 l-35 -15 41 -1 c61 -1 162 33 230 78 114 75 199 184 235 302 18 59 24 160 8 134z"/>
          <path d="M10 487 c0 -90 73 -239 156 -322 89 -87 232 -155 327 -155 56 0 38 12 -64 44 -100 31 -186 83 -249 150 -60 64 -94 125 -125 223 -30 92 -45 112 -45 60z"/>
        </g>
      </svg>

      {/* SVG para las palabras */}
      <svg 
        ref={svgRef} 
        width={width} 
        height={height}
        className="relative z-10"
        style={{ mixBlendMode: 'multiply' }}
      >
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {cloudWords.map((word, i) => {
            // Calcular opacidad basada en frecuencia
            const freq = wordFreqMap.get(word.text) || 1;
            const relFreq = (freq - minFreq) / (maxFreq - minFreq || 1);
            const opacity = 0.85 + relFreq * 0.15; // 0.85 a 1.0
            
            return (
              <text
                key={i}
                style={{
                  fontSize: word.size,
                  fontFamily: 'PT Sans, Arial, sans-serif',
                  fontWeight: relFreq > 0.6 ? 'bold' : '600',
                  fill: '#00755E',
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
    </div>
  );
}