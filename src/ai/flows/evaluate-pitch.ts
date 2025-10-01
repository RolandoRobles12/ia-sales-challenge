// src/ai/flows/evaluate-pitch.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ConversationMessage, Product, CustomerProfile, PitchEvaluation } from '@/types';

const EvaluatePitchInputSchema = z.object({
  product: z.enum(['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra']),
  customerProfile: z.object({
    name: z.string(),
    occupation: z.string(),
    objections: z.array(z.string()),
    attitudeTrait: z.string(),
  }),
  conversation: z.array(z.object({
    sender: z.enum(['user', 'avatar']),
    text: z.string(),
  })),
});

export type EvaluatePitchInput = z.infer<typeof EvaluatePitchInputSchema>;

const EvaluatePitchOutputSchema = z.object({
  greeting: z.number().min(1).max(10).describe('Calidad del saludo y apertura'),
  needIdentification: z.number().min(1).max(10).describe('Identificación de necesidades del cliente'),
  productPresentation: z.number().min(1).max(10).describe('Presentación clara del producto'),
  benefitsCommunication: z.number().min(1).max(10).describe('Comunicación efectiva de beneficios'),
  objectionHandling: z.number().min(1).max(10).describe('Manejo de objeciones'),
  closing: z.number().min(1).max(10).describe('Cierre y llamado a la acción'),
  empathy: z.number().min(1).max(10).describe('Empatía y conexión con el cliente'),
  clarity: z.number().min(1).max(10).describe('Claridad y concisión del mensaje'),
  overallScore: z.number().min(1).max(10).describe('Puntuación general'),
  feedback: z.string().describe('Retroalimentación detallada con fortalezas y áreas de mejora'),
});

export type EvaluatePitchOutput = z.infer<typeof EvaluatePitchOutputSchema>;

export async function evaluatePitch(input: EvaluatePitchInput): Promise<PitchEvaluation> {
  return evaluatePitchFlow(input);
}

const evaluatePitchPrompt = ai.definePrompt({
  name: 'evaluatePitchPrompt',
  input: { schema: EvaluatePitchInputSchema },
  output: { schema: EvaluatePitchOutputSchema },
  prompt: `Eres un experto evaluador de técnicas de ventas con 20 años de experiencia en la industria financiera mexicana.

**CONTEXTO DE LA SIMULACIÓN:**
- Producto: {{product}}
- Cliente: {{customerProfile.name}}, {{customerProfile.occupation}}
- Perfil actitudinal: {{customerProfile.attitudeTrait}}
- Objeciones esperadas: {{#each customerProfile.objections}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

**CONVERSACIÓN A EVALUAR:**
{{#each conversation}}
{{#if (eq sender "user")}}**Vendedor:** {{text}}{{/if}}
{{#if (eq sender "avatar")}}**Cliente:** {{text}}{{/if}}
{{/each}}

**CRITERIOS DE EVALUACIÓN (1-10):**

1. **Saludo (greeting):** 
   - ¿Hubo apertura profesional y cálida?
   - ¿Se presentó correctamente?
   - ¿Generó rapport inicial?

2. **Identificación de Necesidades (needIdentification):**
   - ¿Hizo preguntas para entender al cliente?
   - ¿Escuchó activamente?
   - ¿Adaptó el mensaje a las necesidades?

3. **Presentación del Producto (productPresentation):**
   - ¿Explicó claramente qué es {{product}}?
   - ¿Mencionó características relevantes?
   - ¿Fue organizado y estructurado?

4. **Comunicación de Beneficios (benefitsCommunication):**
   - ¿Conectó beneficios con necesidades del cliente?
   - ¿Usó ejemplos concretos?
   - ¿Enfatizó el valor para el cliente?

5. **Manejo de Objeciones (objectionHandling):**
   - ¿Respondió a las objeciones con empatía?
   - ¿Proporcionó respuestas convincentes?
   - ¿Mantuvo la calma y profesionalismo?

6. **Cierre (closing):**
   - ¿Propuso un siguiente paso claro?
   - ¿Intentó cerrar la venta?
   - ¿Fue apropiado y no agresivo?

7. **Empatía (empathy):**
   - ¿Mostró comprensión de la situación del cliente?
   - ¿Fue genuino y auténtico?
   - ¿Adaptó su tono al perfil del cliente?

8. **Claridad (clarity):**
   - ¿Fue conciso y al grano?
   - ¿Evitó tecnicismos innecesarios?
   - ¿El mensaje fue fácil de entender?

9. **Puntuación General (overallScore):**
   - Promedio ponderado de todos los criterios
   - Considera efectividad global del pitch

**FEEDBACK:**
Proporciona retroalimentación constructiva en español, incluyendo:
- 2-3 fortalezas principales
- 2-3 áreas de mejora específicas
- 1 consejo práctico para mejorar
- Tono: profesional pero motivador

**IMPORTANTE:**
- Sé justo pero exigente
- Considera el contexto mexicano
- Valora el esfuerzo pero marca errores claros
- Usa escala completa (1-10), no solo 7-10`,
});

const evaluatePitchFlow = ai.defineFlow(
  {
    name: 'evaluatePitchFlow',
    inputSchema: EvaluatePitchInputSchema,
    outputSchema: EvaluatePitchOutputSchema,
  },
  async (input) => {
    const { output } = await evaluatePitchPrompt(input);
    return output!;
  }
);