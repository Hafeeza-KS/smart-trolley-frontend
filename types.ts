
export enum ItemStatus {
  SCANNED = 'SCANNED',
  UNSCANNED = 'UNSCANNED',
  PENDING = 'PENDING'
}

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'ml' | 'kn' | 'ur' | 'bn';

export interface Product {
  barcode: string;
  name: string;
  price: number;
  weight: number; // in grams
  category: string;
  location: { x: number, y: number, zone: string };
}

export interface CartItem {
  id: string;
  barcode: string | null;
  name: string;
  weight: number;
  price: number | null;
  status: ItemStatus;
  timestamp: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  completed: boolean;
  productId?: string; // Link to Product database if matched
}

export interface ESP32Message {
  barcode: string | null;
  weight_change: number;
  timestamp: string;
}

export type Screen = 'list' | 'cart' | 'nav' | 'offers' | 'billing';
