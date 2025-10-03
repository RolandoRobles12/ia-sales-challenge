'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

export interface WordData {
  text: string;
  value: number;
}

interface AestheticWordCloudProps {
  words: WordData[];
  width?: number;
  height?: number;
  title?: string;
}

export default function AestheticWordCloud({ 
  words, 
  width = 800, 
  height = 500,
  title 
}: AestheticWordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !words || words.length === 0) return;

    // Limpiar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove();

    // Colores de Aviva (gradiente verde-teal)
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 0.3, 0.6, 1])
      .range([
        '#10b981', // green-500
        '#14b8a6', // teal-500
        '#06b6d4', // cyan-500
        '#0891b2', // cyan-600
      ]);

    // Calcular tamaños
    const maxValue = Math.max(...words.map(w => w.value));
    const minValue = Math.min(...words.map(w => w.value));

    const fontSizeScale = d3.scaleLog()
      .domain([minValue || 1, maxValue])
      .range([14, 80]);

    // Preparar datos para d3-cloud
    const cloudWords = words.map(w => ({
      text: w.text,
      size: fontSizeScale(w.value),
      value: w.value,
    }));

    // Configurar layout de word cloud
    const layout = cloud()
      .size([width, height])
      .words(cloudWords as any)
      .padding(8)
      .rotate(() => {
        const random = Math.random();
        if (random < 0.6) return 0; // 60% horizontal
        if (random < 0.8) return -45; // 20% diagonal izquierda
        return 45; // 20% diagonal derecha
      })
      .font('PT Sans, sans-serif')
      .fontSize(d => d.size!)
      .spiral('archimedean')
      .on('end', draw);

    layout.start();

    function draw(calculatedWords: any[]) {
      const svg = d3.select(svgRef.current);

      // Grupo principal centrado
      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

      // Crear palabras
      const text = g
        .selectAll('text')
        .data(calculatedWords)
        .enter()
        .append('text')
        .style('font-family', 'PT Sans, sans-serif')
        .style('font-weight', (d: any) => {
          const intensity = (d.value - minValue) / (maxValue - minValue || 1);
          return intensity > 0.7 ? '700' : intensity > 0.4 ? '600' : '400';
        })
        .style('font-size', (d: any) => `${d.size}px`)
        .style('fill', (d: any) => {
          const intensity = (d.value - minValue) / (maxValue - minValue || 1);
          return colorScale(intensity);
        })
        .style('opacity', 0)
        .attr('text-anchor', 'middle')
        .attr('transform', (d: any) => 
          `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
        )
        .text((d: any) => d.text)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event: any, d: any) {
          setHoveredWord(d.text);
          d3.select(this)
            .transition()
            .duration(200)
            .style('opacity', 1)
            .style('font-size', `${d.size * 1.2}px`)
            .style('filter', 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))');
        })
        .on('mouseleave', function(event: any, d: any) {
          setHoveredWord(null);
          d3.select(this)
            .transition()
            .duration(200)
            .style('opacity', 0.85)
            .style('font-size', `${d.size}px`)
            .style('filter', 'none');
        });

      // Animación de entrada
      text
        .transition()
        .duration(1000)
        .delay((d: any, i: number) => i * 50)
        .style('opacity', 0.85);

      // Tooltip con valor
      const tooltip = svg
        .append('text')
        .attr('class', 'tooltip')
        .attr('text-anchor', 'middle')
        .attr('y', height - 20)
        .attr('x', width / 2)
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#0f766e')
        .style('opacity', 0);

      text.on('mouseenter', function(event: any, d: any) {
        tooltip
          .text(`${d.text}: ${d.value} ${d.value === 1 ? 'vez' : 'veces'}`)
          .transition()
          .duration(200)
          .style('opacity', 1);
      }).on('mouseleave', function() {
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 0);
      });
    }

    return () => {
      layout.stop();
    };
  }, [words, width, height, maxValue, minValue]);

  if (!words || words.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200"
        style={{ width, height }}
      >
        <div className="text-center p-8">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-lg font-semibold text-gray-600">
            No hay palabras aún
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Sé el primero en compartir
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {title && (
        <h3 className="text-xl font-bold text-center mb-4 text-emerald-700">
          {title}
        </h3>
      )}
      <div 
        className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-2xl shadow-xl border-2 border-emerald-200 overflow-hidden relative"
        style={{ width, height }}
      >
        {/* Efecto de brillo de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-teal-400/5 pointer-events-none" />
        
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="relative z-10"
        />

        {/* Badge de contador */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-emerald-200">
          <span className="text-sm font-semibold text-emerald-700">
            {words.length} {words.length === 1 ? 'palabra' : 'palabras'}
          </span>
        </div>

        {/* Indicador de hover */}
        {hoveredWord && (
          <div className="absolute top-4 left-4 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <span className="text-sm font-semibold">
              {hoveredWord}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}