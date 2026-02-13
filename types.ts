export interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Invoice {
  id: string;
  items: InvoiceItem[];
  totalAmount: number;
  date: string; // ISO String
  timestamp: number;
  paymentMethod: 'cash' | 'instapay';
}

export interface AppSettings {
  appName: string;
}

export type ViewState = 'dashboard' | 'invoices' | 'soldItems' | 'settings';
