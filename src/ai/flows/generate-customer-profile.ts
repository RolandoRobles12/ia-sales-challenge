// src/ai/flows/generate-customer-profile.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Product, Mode, DifficultyLevel, CustomerProfile } from '@/types';

// Exportar también para uso en otros flujos

const GenerateCustomerProfileInputSchema = z.object({
  product: z.enum(['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra']),
  mode: z.enum(['Curioso', 'Desconfiado', 'Apurado']),
  difficultyLevel: z.enum(['Fácil', 'Intermedio', 'Difícil', 'Avanzado', 'Súper Embajador', 'Leyenda']),
});

export type GenerateCustomerProfileInput = z.infer<typeof GenerateCustomerProfileInputSchema>;

const GenerateCustomerProfileOutputSchema = z.object({
  name: z.string().describe('Nombre del cliente'),
  age: z.number().describe('Edad del cliente'),
  occupation: z.string().describe('Ocupación del cliente'),
  context: z.string().describe('Contexto y situación actual del cliente'),
  objections: z.array(z.string()).describe('Lista de 3-6 objeciones específicas que el cliente planteará'),
  commonQuestions: z.array(z.string()).describe('Lista de 3-5 preguntas comunes que hará el cliente'),
  attitudeTrait: z.string().describe('Rasgo actitudinal específico del cliente'),
});

export type GenerateCustomerProfileOutput = z.infer<typeof GenerateCustomerProfileOutputSchema>;

export async function generateCustomerProfile(
  input: GenerateCustomerProfileInput
): Promise<CustomerProfile> {
  const result = await generateCustomerProfileFlow(input);
  return {
    ...result,
    difficultyLevel: input.difficultyLevel,
  };
}

const generateCustomerProfilePrompt = ai.definePrompt({
  name: 'generateCustomerProfilePrompt',
  input: { schema: GenerateCustomerProfileInputSchema },
  output: { schema: GenerateCustomerProfileOutputSchema },
  prompt: `Eres un experto en crear perfiles realistas de clientes mexicanos para simulaciones de ventas.

Basándote en el documento de perfiles de clientes proporcionado, genera UN NUEVO perfil único y realista que:

**Producto:** {{product}}
**Modo:** {{mode}}
**Nivel de dificultad:** {{difficultyLevel}}

**INSTRUCCIONES CRÍTICAS:**

1. **Variabilidad:** Crea un perfil ÚNICO que no sea idéntico a los ejemplos del documento. Usa diferentes:
   - Nombres (típicos mexicanos)
   - Edades (20-65 años)
   - Ocupaciones (acordes al producto)
   - Situaciones de vida específicas

2. **Realismo:** El perfil debe reflejar un cliente real de México que podría comprar {{product}}

3. **Objeciones según nivel:**
   - **Fácil:** 3 objeciones básicas y directas
   - **Intermedio:** 4-5 objeciones más elaboradas
   - **Difícil/Avanzado:** 5-6 objeciones complejas y entrelazadas
   - **Súper Embajador/Leyenda:** 6+ objeciones muy específicas, técnicas o emocionales

4. **Modo de cliente:**
   - **Curioso:** Hace muchas preguntas, quiere entender todo
   - **Desconfiado:** Escéptico, busca pruebas, compara con competencia
   - **Apurado:** Directo, sin tiempo, quiere solo lo esencial

5. **Coherencia con el producto:**
   - Aviva Contigo: Personas que necesitan seguro de vida
   - Aviva Tu Negocio: Pequeños empresarios/emprendedores
   - Aviva Tu Casa: Propietarios preocupados por su hogar
   - Aviva Tu Compra: Consumidores que hacen compras importantes

**EJEMPLOS DE VARIACIÓN (NO COPIAR):**
- En lugar de "Carlos, mecánico", podrías crear "Sandra, estilista"
- En lugar de "Don Ernesto, comerciante", podrías crear "Patricia, maestra"

Genera un perfil completamente nuevo, inspirado pero NO copiado del documento.`,
});

const generateCustomerProfileFlow = ai.defineFlow(
  {
    name: 'generateCustomerProfileFlow',
    inputSchema: GenerateCustomerProfileInputSchema,
    outputSchema: GenerateCustomerProfileOutputSchema,
  },
  async (input) => {
    const { output } = await generateCustomerProfilePrompt(input);
    return output!;
  }
);