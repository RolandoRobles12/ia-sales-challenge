'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Product, Mode } from '@/types';
import { PlayCircle, Mic } from 'lucide-react';

interface SettingsFormProps {
  onStart: (settings: { product: Product; mode: Mode }) => void;
  useVoiceAgent?: boolean;
  onToggleVoiceAgent?: (value: boolean) => void;
}

const products: Product[] = ['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra'];
const modes: Mode[] = ['Curioso', 'Desconfiado', 'Apurado'];
const modeDescriptions = {
  Curioso: 'Un cliente que muestra interés y hace muchas preguntas.',
  Desconfiado: 'Un cliente escéptico que necesita garantías y pruebas.',
  Apurado: 'Un cliente con poco tiempo que busca soluciones rápidas y directas.'
};

export default function SettingsForm({ 
  onStart, 
  useVoiceAgent = true, 
  onToggleVoiceAgent 
}: SettingsFormProps) {
  const [product, setProduct] = useState<Product>('Aviva Contigo');
  const [mode, setMode] = useState<Mode>('Curioso');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({ product, mode });
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Configura tu práctica</CardTitle>
          <CardDescription>
            Elige el producto que vas a vender y la personalidad del cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <Button type="submit" size="lg" className="w-full font-bold">
              {useVoiceAgent ? (
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