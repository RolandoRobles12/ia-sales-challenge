'use server';
/**
 * @fileOverview An AI agent to generate responses for the avatar in the sales pitch simulation.
 *
 * - generateAvatarResponse - A function that generates the avatar's response based on the participant's pitch, product, and mode.
 * - GenerateAvatarResponseInput - The input type for the generateAvatarResponse function.
 * - GenerateAvatarResponseOutput - The return type for the generateAvatarResponse function.
 */

import {ai} from '@/ai/genkit';
import {z, generate} from 'genkit';

const GenerateAvatarResponseInputSchema = z.object({
  pitchText: z
    .string()
    .describe("The transcribed text of the participant's sales pitch."),
  product: z
    .enum(['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra'])
    .describe('The product being pitched.'),
  mode: z
    .enum(['Curioso', 'Desconfiado', 'Apurado'])
    .describe('The customer mode for the avatar to adopt.'),
});
export type GenerateAvatarResponseInput = z.infer<
  typeof GenerateAvatarResponseInputSchema
>;

const GenerateAvatarResponseOutputSchema = z.object({
  responseText: z.string().describe('The response text from the avatar.'),
});
export type GenerateAvatarResponseOutput = z.infer<
  typeof GenerateAvatarResponseOutputSchema
>;

export async function generateAvatarResponse(
  input: GenerateAvatarResponseInput,
  {
    onChunk,
    onDone,
  }: {
    onChunk: (chunk: {text: string}) => void;
    onDone: (finalResponse: GenerateAvatarResponseOutput) => void;
  }
) {
  const {stream} = await generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: [
      {
        role: 'system',
        content: `Actúas como un cliente potencial de Aviva en ${input.mode}. Responde en tono humano, breve (≤2 frases), haciendo preguntas y objeciones realistas. Contexto de producto: ${input.product}. Perfil: microcomerciante con recursos limitados. Evita tecnicismos. Introduce una objeción nueva cada dos turnos. Si el tiempo está por terminar, pide una propuesta concreta para cerrar hoy.\n\nMensajes del usuario=transcripción STT.\n\nSeguridad: nunca des información financiera sensible; no prometas tasas exactas.`,
      },
      {role: 'user', content: input.pitchText},
    ],
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      onChunk({text});
    }
  }

  onDone({responseText: fullText});
}
