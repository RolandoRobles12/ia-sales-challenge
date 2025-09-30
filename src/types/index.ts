export type Product = 'Aviva Contigo' | 'Aviva Tu Negocio' | 'Aviva Tu Casa' | 'Aviva Tu Compra';
export type Mode = 'Curioso' | 'Desconfiado' | 'Apurado';

export interface ConversationMessage {
  id?: number;
  sender: 'user' | 'avatar';
  text: string;
  isLoading?: boolean;
}

export interface Pitch {
  id: string;
  product: Product;
  text: string;
  upvotes: number;
  downvotes: number;
  createdAt: any; // Firestore timestamp
  votes?: { [userId: string]: 'up' | 'down' };
}
