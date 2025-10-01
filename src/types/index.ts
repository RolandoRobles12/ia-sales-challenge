// src/types/index.ts
export type Product = 'Aviva Contigo' | 'Aviva Tu Negocio' | 'Aviva Tu Casa' | 'Aviva Tu Compra';
export type Mode = 'Curioso' | 'Desconfiado' | 'Apurado';

// Niveles de dificultad del documento PDF
export type DifficultyLevel = 'Fácil' | 'Intermedio' | 'Difícil' | 'Avanzado' | 'Súper Embajador' | 'Leyenda';

// Perfil del cliente con objeciones específicas
export interface CustomerProfile {
  name: string;
  age: number;
  occupation: string;
  context: string;
  objections: string[];
  commonQuestions: string[];
  attitudeTrait: string;
  difficultyLevel: DifficultyLevel;
}

// Criterios de evaluación del pitch
export interface PitchEvaluation {
  greeting: number; // 1-10: Calidad del saludo inicial
  needIdentification: number; // 1-10: Identificación de necesidades
  productPresentation: number; // 1-10: Presentación clara del producto
  benefitsCommunication: number; // 1-10: Comunicación de beneficios
  objectionHandling: number; // 1-10: Manejo de objeciones
  closing: number; // 1-10: Cierre y llamado a la acción
  empathy: number; // 1-10: Empatía y conexión
  clarity: number; // 1-10: Claridad del mensaje
  overallScore: number; // 1-10: Puntuación general
  feedback: string; // Retroalimentación textual
}

export interface ConversationMessage {
  id?: number;
  sender: 'user' | 'avatar';
  text: string;
  isLoading?: boolean;
  timestamp?: Date;
}

export interface SimulationSession {
  id: string;
  userId: string;
  product: Product;
  mode: Mode;
  customerProfile: CustomerProfile;
  conversation: ConversationMessage[];
  evaluation?: PitchEvaluation;
  startedAt: Date;
  completedAt?: Date;
  duration: number; // en segundos
}

export interface Pitch {
  id: string;
  userId: string;
  userName: string;
  product: Product;
  text: string;
  evaluation: PitchEvaluation;
  upvotes: number;
  downvotes: number;
  createdAt: any; // Firestore timestamp
  votes?: { [userId: string]: 'up' | 'down' };
  sessionId: string; // Referencia a la sesión de simulación
}