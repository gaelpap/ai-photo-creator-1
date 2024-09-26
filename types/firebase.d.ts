import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

declare global {
  interface Window {
    firebase?: any;
  }
}

declare module '@/lib/firebase' {
  export const auth: Auth;
  export const db: Firestore;
}