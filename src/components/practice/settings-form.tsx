'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product, Mode } from '@/types';
import { PlayCircle } from 'lucide-react';

interface SettingsFormProps {
  onStart: (settings: { product: Product; mode: Mode }) => void;
}

const products: Product[] = ['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra'];
const modes: Mode[] = ['Curioso', 'Desconfiado', 'Apurado'];
const modeDescriptions = {
  Curioso: 'Un cliente que muestra interés y hace muchas preguntas.',
  Desconfiado: 'Un cliente escéptico que necesita garantías y pruebas.',
  Apurado: 'Un cliente con poco tiempo que busca soluciones rápidas y directas.'
};

export default function SettingsForm({ onStart }: SettingsFormProps) {
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
          <CardDescription>Elige el producto que vas a vender y la personalidad del cliente.</CardDescription>
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
            <Button type="submit" size="lg" className="w-full font-bold">
              <PlayCircle className="mr-2 h-5 w-5" />
              Iniciar Simulación
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
