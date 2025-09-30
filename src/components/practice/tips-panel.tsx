'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Product } from '@/types';
import { Button } from '../ui/button';
import { Lightbulb } from 'lucide-react';

const objections = {
  'Aviva Contigo': [
    "No estoy seguro de necesitar un seguro de vida ahora mismo.",
    "Parece muy caro, ¿no hay opciones más económicas?",
    "Ya tengo el seguro del trabajo, ¿para qué quiero otro?",
    "¿Y si dejo de pagar una cuota? ¿Pierdo todo?"
  ],
  'Aviva Tu Negocio': [
    "Mi negocio es muy pequeño, no creo que valga la pena.",
    "Prefiero ahorrar ese dinero para emergencias.",
    "Otras aseguradoras me ofrecen algo parecido más barato.",
    "El proceso de reclamo seguro es muy complicado."
  ],
  'Aviva Tu Casa': [
    "Nunca me ha pasado nada, ¿por qué iba a pasar ahora?",
    "El seguro de la comunidad ya cubre el edificio.",
    "¿Cubre también las cosas de valor que tengo dentro?",
    "Seguro que hay mucha letra pequeña que no me cuentas."
  ],
  'Aviva Tu Compra': [
    "¿Realmente funciona? Suena complicado.",
    "No compro cosas tan caras como para necesitar un seguro.",
    "Prefiero confiar en la garantía del vendedor.",
    "Debe ser muy costoso para cada compra que haga."
  ],
};

const goodPitchChecklist = [
  "Saludo y presentación clara.",
  "Identifica una necesidad del cliente.",
  "Presenta el producto como la solución.",
  "Menciona 2-3 beneficios clave.",
  "Maneja las objeciones con empatía.",
  "Llama a la acción con un cierre claro."
];

interface TipsPanelProps {
  product: Product;
  isSheet?: boolean;
}

const TipsContent = ({ product }: { product: Product }) => (
  <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
    <AccordionItem value="item-1">
      <AccordionTrigger>Checklist de Pitch</AccordionTrigger>
      <AccordionContent>
        <ul className="list-disc space-y-2 pl-5">
          {goodPitchChecklist.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
      <AccordionTrigger>Posibles Objeciones ({product})</AccordionTrigger>
      <AccordionContent>
        <ul className="list-disc space-y-2 pl-5">
          {objections[product].map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default function TipsPanel({ product, isSheet = false }: TipsPanelProps) {
  if (isSheet) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full">
            <Lightbulb className="mr-2 h-4 w-4" /> Ver Tips y Objeciones
          </Button>
        </SheetTrigger>
        <SheetContent>
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle>Tips de Venta</CardTitle>
            </CardHeader>
            <CardContent>
              <TipsContent product={product} />
            </CardContent>
          </Card>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline text-center">Tips de Venta</CardTitle>
      </CardHeader>
      <CardContent>
        <TipsContent product={product} />
      </CardContent>
    </Card>
  );
}
