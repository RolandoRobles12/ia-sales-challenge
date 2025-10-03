// src/components/competition/word-cloud.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupNumber } from '@/types';
import { cn } from '@/lib/utils';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface WordCloudInputProps {
  groupNumber: GroupNumber;
  onSubmit: (word: string) => Promise<void>;
  disabled?: boolean;
  hasSubmitted?: boolean;
}

export function WordCloudInput({ groupNumber, onSubmit, disabled, hasSubmitted }: WordCloudInputProps) {
  const [word, setWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(word.trim());
      setWord('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <MessageSquare className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="text-lg font-semibold text-emerald-700">✓ Palabra enviada</p>
        <p className="text-sm text-muted-foreground mt-1">
          Ya enviaste tu palabra para este grupo
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Comparte una palabra que describa lo que más te gustó de esta presentación
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Una palabra..."
          maxLength={30}
          disabled={disabled || isSubmitting}
          className="flex-1 text-lg"
        />
        <Button 
          type="submit" 
          size="lg"
          disabled={!word.trim() || disabled || isSubmitting}
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}

interface WordCloudDisplayProps {
  words: { word: string; count: number }[];
  animated?: boolean;
}

export function WordCloudDisplay({ words, animated = true }: WordCloudDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !words || words.length === 0) return;

    const width = 800;
    const height = 500;

    const maxCount = Math.max(...words.map(w => w.count));
    const minCount = Math.min(...words.map(w => w.count));

    d3.select(svgRef.current).selectAll('*').remove();

    const colorScale = d3.scaleLinear<string>()
      .domain([0, 0.25, 0.5, 0.75, 1])
      .range([
        '#34d399', // emerald-400
        '#10b981', // emerald-500
        '#14b8a6', // teal-500
        '#06b6d4', // cyan-500
        '#0284c7', // sky-600
      ]);

    const fontSizeScale = d3.scalePow()
      .exponent(0.8)
      .domain([minCount || 1, maxCount])
      .range([18, 90]);

    const cloudWords = words.map(w => ({
      text: w.word,
      size: fontSizeScale(w.count),
      count: w.count,
    }));

    const layout = cloud()
      .size([width, height])
      .words(cloudWords as any)
      .padding(10)
      .rotate(() => {
        const random = Math.random();
        if (random < 0.7) return 0;
        if (random < 0.85) return -30;
        return 30;
      })
      .font('PT Sans, system-ui, sans-serif')
      .fontSize(d => d.size!)
      .spiral('archimedean')
      .on('end', draw);

    layout.start();

    function draw(calculatedWords: any[]) {
      const svg = d3.select(svgRef.current);

      const defs = svg.append('defs');
      
      const radialGradient = defs.append('radialGradient')
        .attr('id', 'bg-gradient')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
      
      radialGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#f0fdfa')
        .attr('stop-opacity', 1);
      
      radialGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#ccfbf1')
        .attr('stop-opacity', 1);

      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

      const text = g
        .selectAll('text')
        .data(calculatedWords)
        .enter()
        .append('text')
        .style('font-family', 'PT Sans, system-ui, sans-serif')
        .style('font-weight', (d: any) => {
          const intensity = (d.count - minCount) / (maxCount - minCount || 1);
          return intensity > 0.75 ? '800' : intensity > 0.5 ? '700' : intensity > 0.25 ? '600' : '500';
        })
        .style('font-size', (d: any) => `${d.size}px`)
        .style('fill', (d: any) => {
          const intensity = (d.count - minCount) / (maxCount - minCount || 1);
          return colorScale(intensity);
        })
        .style('opacity', 0)
        .style('letter-spacing', '0.02em')
        .attr('text-anchor', 'middle')
        .attr('transform', (d: any) => 
          `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
        )
        .text((d: any) => d.text)
        .style('cursor', 'pointer')
        .style('transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)')
        .on('mouseenter', function(event: any, d: any) {
          setHoveredWord(d.text);
          d3.select(this)
            .transition()
            .duration(250)
            .ease(d3.easeCubicOut)
            .style('opacity', 1)
            .style('font-size', `${d.size * 1.25}px`)
            .style('filter', 'drop-shadow(0 8px 16px rgba(6, 182, 212, 0.4))')
            .attr('transform', `translate(${d.x}, ${d.y - 5}) rotate(${d.rotate})`);
        })
        .on('mouseleave', function(event: any, d: any) {
          setHoveredWord(null);
          d3.select(this)
            .transition()
            .duration(250)
            .ease(d3.easeCubicOut)
            .style('opacity', 0.92)
            .style('font-size', `${d.size}px`)
            .style('filter', 'none')
            .attr('transform', `translate(${d.x}, ${d.y}) rotate(${d.rotate})`);
        });

      if (animated) {
        text
          .transition()
          .duration(1200)
          .delay((d: any, i: number) => i * 60)
          .ease(d3.easeCubicOut)
          .style('opacity', 0.92);
      } else {
        text.style('opacity', 0.92);
      }

      const tooltip = svg
        .append('g')
        .attr('class', 'tooltip')
        .style('opacity', 0);

      const tooltipBg = tooltip
        .append('rect')
        .attr('rx', 12)
        .attr('ry', 12)
        .attr('fill', '#0f766e')
        .attr('filter', 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))');

      const tooltipText = tooltip
        .append('text')
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#f0fdfa')
        .style('letter-spacing', '0.02em');

      text.on('mouseenter', function(event: any, d: any) {
        const textContent = `${d.text}: ${d.count}${d.count === 1 ? ' vez' : ' veces'}`;
        tooltipText.text(textContent);
        
        const bbox = tooltipText.node()!.getBBox();
        tooltipBg
          .attr('x', bbox.x - 12)
          .attr('y', bbox.y - 6)
          .attr('width', bbox.width + 24)
          .attr('height', bbox.height + 12);

        tooltip
          .attr('transform', `translate(${width / 2}, ${height - 30})`)
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
  }, [words, animated]);

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 rounded-2xl border-2 border-teal-200 shadow-xl">
        <div className="text-center p-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <p className="relative text-7xl">💬</p>
          </div>
          <p className="text-xl font-bold text-gray-700 mb-2">
            Sin palabras por ahora
          </p>
          <p className="text-sm text-gray-500">
            ¡Sé el primero en compartir tu opinión!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative bg-gradient-to-br from-teal-50 via-white to-emerald-50 rounded-2xl border-2 border-teal-200 shadow-2xl overflow-hidden"
      style={{ minHeight: '500px' }}
    >
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-br from-teal-200/30 to-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-cyan-200/30 to-sky-200/30 rounded-full blur-3xl"></div>
      </div>

      {hoveredWord && (
        <div className="absolute top-6 left-6 z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2.5 rounded-full shadow-xl border-2 border-white/20 backdrop-blur-sm">
            <span className="text-sm font-bold tracking-wide">{hoveredWord}</span>
          </div>
        </div>
      )}

      <div className="absolute top-6 right-6 z-10">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border-2 border-teal-300">
          <span className="text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            {words.length} {words.length === 1 ? 'palabra' : 'palabras'}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center p-8">
        <svg
          ref={svgRef}
          width={800}
          height={500}
          className="drop-shadow-sm"
        />
      </div>
    </div>
  );
}

interface GroupWordCloudCardProps {
  groupNumber: GroupNumber;
  words: { word: string; count: number }[];
  hasUserSubmitted?: boolean;
  onSubmit: (word: string) => Promise<void>;
  disabled?: boolean;
}

export function GroupWordCloudCard({
  groupNumber,
  words,
  hasUserSubmitted,
  onSubmit,
  disabled
}: GroupWordCloudCardProps) {
  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700">
          Grupo {groupNumber} - Word Cloud
        </CardTitle>
        <CardDescription>
          ¿Qué es lo que más te gustó? (Una palabra)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WordCloudInput
          groupNumber={groupNumber}
          onSubmit={onSubmit}
          disabled={disabled}
          hasSubmitted={hasUserSubmitted}
        />
      </CardContent>
    </Card>
  );
}