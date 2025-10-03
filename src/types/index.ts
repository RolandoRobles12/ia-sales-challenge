// src/types/index.ts
export type Product = 'Aviva Contigo' | 'Aviva Tu Negocio' | 'Aviva Tu Casa' | 'Aviva Tu Compra';
export type Mode = 'Curioso' | 'Desconfiado' | 'Apurado';
export type DifficultyLevel = 'Fácil' | 'Intermedio' | 'Difícil' | 'Avanzado' | 'Súper Embajador' | 'Leyenda';

// Grupos de competencia
export type GroupNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface PracticeSettings {
  product: Product;
  mode: Mode;
  difficultyLevel: DifficultyLevel;
  pitchDuration: number; // en segundos
  qnaDuration: number; // en segundos
}

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

export interface PitchEvaluation {
  greeting: number;
  needIdentification: number;
  productPresentation: number;
  benefitsCommunication: number;
  objectionHandling: number;
  closing: number;
  empathy: number;
  clarity: number;
  overallScore: number;
  feedback: string;
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
  duration: number;
}

// Calificación con estrellas
export interface StarRating {
  id: string;
  groupNumber: GroupNumber;
  userId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  createdAt: any; // Firestore timestamp
}

// Palabra del word cloud
export interface WordCloudEntry {
  id: string;
  groupNumber: GroupNumber;
  userId: string;
  word: string;
  createdAt: any; // Firestore timestamp
}

// Estadísticas agregadas por grupo
export interface GroupStats {
  groupNumber: GroupNumber;
  averageStars: number;
  totalRatings: number;
  wordCloud: { word: string; count: number }[];
}

// Configuración de votación
export interface VotingConfig {
  isOpen: boolean;
  closeTime?: any; // Firestore Timestamp
  openTime?: any; // Firestore Timestamp
}

// User roles
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any;
  updatedAt?: any;
}