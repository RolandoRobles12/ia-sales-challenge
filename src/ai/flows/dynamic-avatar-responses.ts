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

  // Determinar cuándo puede cerrar según dificultad
  const closingThreshold = getClosingThreshold(customerProfile.difficultyLevel);

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

# IMPORTANTE: CIERRE DE VENTA
Estás en el turno ${turnNumber} de la conversación.
${closingThreshold.instruction}

Si decides aceptar, usa EXACTAMENTE una de estas frases naturales mexicanas:
- "Está bien, me interesa. ¿Qué necesito?"
- "Suena bien. ¿Cómo lo solicito?"
- "Ok, me convenciste. ¿Cuál es el siguiente paso?"
- "Va, lo quiero. ¿Qué documentos pido?"
- "Sale, ¿dónde lo pido?"

Para nivel FÁCIL: Usa estas frases después de solo 2-3 intercambios buenos.
Para otros niveles: Espera más turnos según tu dificultad.

NO uses frases formales como "procedamos" o "hagámoslo" - habla como mexicano real.

# INSTRUCCIONES DE RESPUESTA
- SIEMPRE responde en español mexicano
- Máximo 2-3 frases (≤30 palabras)
- Usa lenguaje natural y coloquial
- Presenta una objeción cada 2 turnos (si aún no estás convencido)
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

function getClosingThreshold(level: string): { turns: number; instruction: string } {
  const thresholds: Record<string, { turns: number; instruction: string }> = {
    'Fácil': {
      turns: 2,
      instruction: `IMPORTANTE: Estás en nivel FÁCIL - Eres MUY receptivo.
      
Si el vendedor:
- Te ha saludado amablemente
- Ha mencionado algún beneficio relevante para ti
- Ha respondido 1-2 preguntas básicas

Entonces DEBES mostrar interés y aceptar diciendo:
"Suena bien. ¿Qué necesito para solicitarlo?"
O "Me interesa. ¿Cuál es el siguiente paso?"

NO sigas haciendo objeciones si ya te dieron información básica. Eres FÁCIL de convencer.`
    },
    'Intermedio': {
      turns: 4,
      instruction: 'Eres moderadamente escéptico. Si el vendedor ha respondido bien 3-4 preguntas con ejemplos, puedes decir: "Ok, me convenciste. ¿Cómo lo solicito?"'
    },
    'Difícil': {
      turns: 6,
      instruction: 'Eres crítico pero justo. Solo después de 5-6 respuestas MUY buenas que aborden tus preocupaciones específicas, considera: "Está bien, suena razonable. ¿Qué sigue?"'
    },
    'Avanzado': {
      turns: 8,
      instruction: 'Eres muy analítico. Necesitas ver datos concretos, comparaciones y beneficios claros en 7-8+ intercambios antes de decir: "Los números cuadran. ¿Procedemos?"'
    },
    'Súper Embajador': {
      turns: 12,
      instruction: 'Has tenido malas experiencias. Solo con un pitch excepcional y manejo perfecto de tus objeciones pasadas después de 10+ turnos, podrías decir: "Me has convencido, contra todo pronóstico."'
    },
    'Leyenda': {
      turns: 15,
      instruction: 'Eres casi imposible. Incluso con pitch perfecto, sigues dudando. Muy rara vez aceptas, y solo tras 15+ intercambios impecables.'
    }
  };

  return thresholds[level] || thresholds['Intermedio'];
}

function getDifficultyInstructions(level: string): string {
  const instructions: Record<string, string> = {
    'Fácil': `Eres MUY accesible y positivo. Quieres que te convenzan.
    - Haz 1-2 preguntas básicas simples
    - Si te responden bien, di "Suena bien" o "Me gusta"
    - Después de 2-3 respuestas del vendedor, ACEPTA diciendo: "Ok, quiero solicitarlo. ¿Qué necesito?"
    - NO sigas con objeciones si ya te dieron info básica
    - Eres FÁCIL de convencer - actúa como tal`,
    
    'Intermedio': 'Eres escéptico moderado. Haces 3-4 preguntas pero te convences con buenos ejemplos concretos y comparaciones.',
    
    'Difícil': 'Eres muy crítico. Cuestionas todo, comparas con competidores, y buscas defectos. Necesitas 5-6 respuestas excelentes.',
    
    'Avanzado': 'Eres extremadamente analítico. Pides cifras exactas, términos y condiciones, y encuentras problemas complejos. Muy difícil de convencer.',
    
    'Súper Embajador': 'Eres durísimo. Has tenido malas experiencias previas, repites objeciones, y eres muy difícil de convencer. Casi imposible.',
    
    'Leyenda': 'Eres prácticamente imposible. Interrumpes, cambias de tema, tienes múltiples preocupaciones simultáneas, y eres extremadamente exigente. Nunca aceptas fácilmente.'
  };
  
  return instructions[level] || instructions['Intermedio'];
}