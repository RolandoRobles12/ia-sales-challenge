// src/components/practice/settings-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import type { Product, Mode, DifficultyLevel, PracticeSettings } from '@/types';
import { PlayCircle, Mic, Loader2, Clock } from 'lucide-react';

interface SettingsFormProps {
  onStart: (settings: PracticeSettings) => void;
  useVoiceAgent?: boolean;
  onToggleVoiceAgent?: (value: boolean) => void;
  isGeneratingProfile?: boolean;
}

const products: Product[] = ['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra'];
const modes: Mode[] = ['Curioso', 'Desconfiado', 'Apurado'];
const difficultyLevels: DifficultyLevel[] = [
  'Fácil', 
  'Intermedio', 
  'Difícil', 
  'Avanzado', 
  'Súper Embajador', 
  'Leyenda'
];

const modeDescriptions: Record<Mode, string> = {
  Curioso: 'Un cliente que muestra interés y hace muchas preguntas.',
  Desconfiado: 'Un cliente escéptico que necesita garantías y pruebas.',
  Apurado: 'Un cliente con poco tiempo que busca soluciones rápidas y directas.'
};

const difficultyDescriptions: Record<DifficultyLevel, string> = {
  'Fácil': '🟢 Cliente accesible con objeciones básicas. Ideal para principiantes.',
  'Intermedio': '🟡 Cliente escéptico con preguntas elaboradas. Requiere buenos argumentos.',
  'Difícil': '🟠 Cliente crítico que compara y cuestiona todo. Para vendedores con experiencia.',
  'Avanzado': '🔴 Cliente analítico que pide cifras exactas. Nivel avanzado.',
  'Súper Embajador': '🟣 Cliente muy difícil con malas experiencias previas. Nivel experto.',
  'Leyenda': '⚫ Cliente prácticamente imposible. Solo para maestros de ventas.'
};

export default function SettingsForm({ 
  onStart, 
  useVoiceAgent = true, 
  onToggleVoiceAgent,
  isGeneratingProfile = false 
}: SettingsFormProps) {
  const [product, setProduct] = useState<Product>('Aviva Contigo');
  const [mode, setMode] = useState<Mode>('Curioso');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('Fácil');
  const [pitchDuration, setPitchDuration] = useState(120); // 2 minutos por defecto
  const [qnaDuration, setQnaDuration] = useState(60); // 1 minuto por defecto

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({ 
      product, 
      mode, 
      difficultyLevel,
      pitchDuration,
      qnaDuration 
    });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Configura tu práctica</CardTitle>
          <CardDescription>
            Elige el producto, personalidad del cliente, nivel de dificultad y duración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Producto */}
            <div className="space-y-2">
              <Label htmlFor="product-select" className="text-lg">Producto</Label>
              <Select value={product} onValueChange={(value) => setProduct(value as Product)}>
                <SelectTrigger id="product-select" className="w-full">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modo del Cliente */}
            <div className="space-y-2">
              <Label htmlFor="mode-select" className="text-lg">Modo del Cliente</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <SelectTrigger id="mode-select" className="w-full">
                  <SelectValue placeholder="Selecciona un modo" />
                </SelectTrigger>
                <SelectContent>
                  {modes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{modeDescriptions[mode]}</p>
            </div>

            {/* Nivel de Dificultad */}
            <div className="space-y-2">
              <Label htmlFor="difficulty-select" className="text-lg">Nivel de Dificultad</Label>
              <Select value={difficultyLevel} onValueChange={(value) => setDifficultyLevel(value as DifficultyLevel)}>
                <SelectTrigger id="difficulty-select" className="w-full">
                  <SelectValue placeholder="Selecciona la dificultad" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{difficultyDescriptions[difficultyLevel]}</p>
            </div>

            {/* Duración del Pitch */}
            <div className="space-y-2">
              <Label htmlFor="pitch-duration" className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duración del Pitch
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="pitch-duration"
                  type="number"
                  min={30}
                  max={600}
                  step={30}
                  value={pitchDuration}
                  onChange={(e) => setPitchDuration(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  segundos ({formatDuration(pitchDuration)})
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tiempo para presentar tu propuesta inicial
              </p>
            </div>

            {/* Duración de Q&A */}
            <div className="space-y-2">
              <Label htmlFor="qna-duration" className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duración de Preguntas y Objeciones
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="qna-duration"
                  type="number"
                  min={30}
                  max={600}
                  step={30}
                  value={qnaDuration}
                  onChange={(e) => setQnaDuration(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  segundos ({formatDuration(qnaDuration)})
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tiempo para responder objeciones y preguntas del cliente
              </p>
            </div>

            {/* Resumen de tiempo total */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Tiempo Total:</span>
                <span className="text-xl font-bold text-primary">
                  {formatDuration(pitchDuration + qnaDuration)}
                </span>
              </div>
            </div>

            {/* Toggle Agente de Voz */}
            {onToggleVoiceAgent && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="voice-agent-toggle" className="text-base cursor-pointer">
                    Usar Agente de Voz de OpenAI
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {useVoiceAgent 
                      ? 'Conversación en tiempo real con voz natural' 
                      : 'Sistema tradicional con texto y síntesis de voz'}
                  </p>
                </div>
                <Switch
                  id="voice-agent-toggle"
                  checked={useVoiceAgent}
                  onCheckedChange={onToggleVoiceAgent}
                />
              </div>
            )}

            {/* Botón de Inicio */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full font-bold"
              disabled={isGeneratingProfile}
            >
              {isGeneratingProfile ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generando perfil del cliente...
                </>
              ) : useVoiceAgent ? (
                <>
                  <Mic className="mr-2 h-5 w-5" />
                  Iniciar con Agente de Voz
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Iniciar Simulación
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}