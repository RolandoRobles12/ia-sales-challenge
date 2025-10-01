// src/ai/flows/dynamic-avatar-responses.ts
'use server';

import { ai } from '@/ai/genkit';
import { z, generate } from 'genkit';
import type { CustomerProfile, Product } from '@/types';

const DynamicAvatarResponseInputSchema = z.object({
  pitchText: z.string().describe("Texto del pitch del vendedor"),
  product: z.enum(['Aviva Contigo', 'Aviva Tu Negocio', 'Aviva Tu Casa', 'Aviva Tu Compra']),
  customerProfile: z.object({
    name: z.string(),
    age: z.number(),
    occupation: z.string(),
    context: z.string(),
    objections: z.array(z.string()),
    commonQuestions: z.array(z.string()),
    attitudeTrait: z.string(),
    difficultyLevel: z.string(),
  }),
  conversationHistory: z.array(z.object({
    sender: z.enum(['user', 'avatar']),
    text: z.string(),
  })).optional().describe("Historial de la conversación"),
  turnNumber: z.number().optional().describe("Número de turno en la conversación"),
});

export type DynamicAvatarResponseInput = z.infer<typeof DynamicAvatarResponseInputSchema>;

const DynamicAvatarResponseOutputSchema = z.object({
  responseText: z.string().describe('Respuesta del avatar como cliente'),
});

export type DynamicAvatarResponseOutput = z.infer<typeof DynamicAvatarResponseOutputSchema>;

export async function generateDynamicAvatarResponse(
  input: DynamicAvatarResponseInput,
  callbacks: {
    onChunk: (chunk: { text: string }) => void;
    onDone: (finalResponse: DynamicAvatarResponseOutput) => void;
  }
) {
  const { stream } = await generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: buildDynamicPrompt(input),
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      callbacks.onChunk({ text });
    }
  }

  callbacks.onDone({ responseText: fullText });
}

function buildDynamicPrompt(input: DynamicAvatarResponseInput): Array<{role: string, content: string}> {
  const { customerProfile, product, pitchText, conversationHistory, turnNumber = 1 } = input;
  
  // Determinar fase de la conversación
  const phase = turnNumber <= 2 ? 'inicial' : turnNumber <= 4 ? 'media' : 'final';
  
  // Seleccionar objeciones según fase
  const phaseObjections = 
    phase === 'inicial' ? customerProfile.objections.slice(0, 2) :
    phase === 'media' ? customerProfile.objections.slice(2, 4) :
    customerProfile.objections.slice(4);

  return [
    {
      role: 'system',
      content: `# TU IDENTIDAD
Eres ${customerProfile.name}, ${customerProfile.age} años, ${customerProfile.occupation}.
${customerProfile.context}

# TU PERSONALIDAD
${customerProfile.attitudeTrait}

# NIVEL DE DIFICULTAD: ${customerProfile.difficultyLevel}
${getDifficultyInstructions(customerProfile.difficultyLevel)}

# PRODUCTO QUE TE ESTÁN VENDIENDO
${product}

# TUS OBJECIONES PRINCIPALES (usar según avanza la conversación)
${customerProfile.objections.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

# PREGUNTAS QUE DEBES HACER
${customerProfile.commonQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

# FASE ACTUAL: ${phase.toUpperCase()}
En esta fase, enfócate en: ${phaseObjections.join(' / ')}

# INSTRUCCIONES DE RESPUESTA
- SIEMPRE responde en español mexicano
- Máximo 2-3 frases (≤30 palabras)
- Usa lenguaje natural y coloquial
- Presenta una objeción cada 2 turnos
- Haz preguntas específicas de tu perfil
- Mantén coherencia con tu ocupación y edad
- NO actúes como vendedor, eres el CLIENTE
- Sé realista: ${customerProfile.attitudeTrait}

${conversationHistory && conversationHistory.length > 0 ? `
# HISTORIAL DE LA CONVERSACIÓN
${conversationHistory.map(msg => 
  msg.sender === 'user' ? `Vendedor: ${msg.text}` : `Tú (${customerProfile.name}): ${msg.text}`
).join('\n')}
` : ''}

# RESPONDE AHORA COMO ${customerProfile.name.toUpperCase()}`,
    },
    {
      role: 'user',
      content: pitchText,
    }
  ];
}

function getDifficultyInstructions(level: string): string {
  const instructions = {
    'Fácil': 'Eres accesible y abierto. Tus objeciones son simples y te convences con buenas explicaciones.',
    'Intermedio': 'Eres escéptico moderado. Necesitas ejemplos concretos y comparaciones antes de decidir.',
    'Difícil': 'Eres muy crítico. Cuestionas todo, comparas con competidores, y buscas defectos.',
    'Avanzado': 'Eres extremadamente analítico. Pides cifras exactas, términos y condiciones, y encuentras problemas complejos.',
    'Súper Embajador': 'Eres durísimo. Has tenido malas experiencias previas, repites objeciones, y eres muy difícil de convencer.',
    'Leyenda': 'Eres prácticamente imposible. Interrumpes, cambias de tema, tienes múltiples preocupaciones simultáneas, y eres extremadamente exigente.'
  };
  
  return instructions[level as keyof typeof instructions] || instructions['Intermedio'];
}