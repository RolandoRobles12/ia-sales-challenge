// src/ai/flows/avatar-pitch-objections.ts
'use server';

/**
 * @fileOverview Simulates a sales pitch with an AI avatar that provides realistic objections.
 *
 * - avatarPitchObjections - A function that orchestrates the sales pitch simulation.
 * - AvatarPitchObjectionsInput - The input type for the avatarPitchObjections function.
 * - AvatarPitchObjectionsOutput - The return type for the avatarPitchObjections function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AvatarPitchObjectionsInputSchema = z.object({
  mode: z
    .enum(['Curious', 'Distrustful', 'Hurried'])
    .describe('The customer mode influencing the avatar personality.'),
  product: z
    .enum(['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra'])
    .describe('The product being pitched.'),
  pitch: z.string().describe('The participant\'s sales pitch text.'),
});

export type AvatarPitchObjectionsInput = z.infer<typeof AvatarPitchObjectionsInputSchema>;

const AvatarPitchObjectionsOutputSchema = z.object({
  response: z.string().describe('The avatar\'s response, including potential objections.'),
});

export type AvatarPitchObjectionsOutput = z.infer<typeof AvatarPitchObjectionsOutputSchema>;

export async function avatarPitchObjections(
  input: AvatarPitchObjectionsInput
): Promise<AvatarPitchObjectionsOutput> {
  return avatarPitchObjectionsFlow(input);
}

const systemPrompt = `Actúas como un cliente potencial de Aviva en {MODO}. Responde en tono humano, breve (≤2 frases), haciendo preguntas y objeciones realistas. Contexto de producto: {PRODUCTO}. Perfil: microcomerciante con recursos limitados. Evita tecnicismos. Introduce una objeción nueva cada dos turnos. Si el tiempo está por terminar, pide una propuesta concreta para cerrar hoy.\n\nMensajes del usuario=transcripción STT.\n\nSeguridad: nunca des información financiera sensible; no prometas tasas exactas.`

const avatarPitchObjectionsPrompt = ai.definePrompt({
  name: 'avatarPitchObjectionsPrompt',
  input: {schema: AvatarPitchObjectionsInputSchema},
  output: {schema: AvatarPitchObjectionsOutputSchema},
  prompt: `${systemPrompt}\n\n{{pitch}}`,
});

const avatarPitchObjectionsFlow = ai.defineFlow(
  {
    name: 'avatarPitchObjectionsFlow',
    inputSchema: AvatarPitchObjectionsInputSchema,
    outputSchema: AvatarPitchObjectionsOutputSchema,
  },
  async input => {
    const {output} = await avatarPitchObjectionsPrompt(input);
    return output!;
  }
);
