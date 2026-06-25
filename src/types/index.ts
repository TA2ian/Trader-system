export type ViewType = 'dashboard' | 'customers' | 'inventory' | 'audit-log' | 'ai' | 'settings' | 'sales-analytics';

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  customerId?: string;
  userId: string;
  timestamp: string;
}

export interface BaseEntity {
  id: string;
  company_id: string;
  created_at: string; // ISO string from Supabase
  updated_at: string;
}

export interface Debt extends BaseEntity {
  clientName: string;
  customer_id?: string;
  amount: number; // Stored as USD for consistency, or Amount in original currency. Let's make amount = USD.
  original_amount?: number;
  original_currency?: 'USD' | 'SYP' | 'TRY';
  exchange_rate?: number;
  timestamp: string;
  notes?: string;
  type?: 'in' | 'out'; // in: payment received, out: debt given
}

export interface InventoryItem extends BaseEntity {
  name: string;
  quantity: number; // Total quantity (can represent total pieces or raw units)
  unitPriceUSD: number; // Base unit price
  lastUpdated: string;
  category?: string;
  sku?: string;
  batch_number?: string;
  
  // Golden Merchant Units & Containers
  unit_type: 'piece' | 'package' | 'weight' | 'dimension' | 'liquid';
  
  // Weight detail
  weight_unit?: 'gram' | 'kg';
  weight_value?: number;
  
  // Dimension detail
  dimension_unit?: 'mm' | 'cm' | 'meter' | 'inch' | 'foot' | 'yard';
  dimension_value?: number;

  // Liquid detail
  liquid_unit?: 'ml' | 'liter' | 'gallon';
  liquid_value?: number;
  
  // Package detail (طرد يحتوي على قطع)
  has_packages?: boolean;
  package_unit?: 'package' | 'dozen' | 'roll' | 'bag' | 'box';
  packages_qty?: number; // Number of unopened packages
  pieces_per_package?: number; // Pieces inside 1 package
  single_pieces_qty?: number; // Loose pieces sold individually
  price_per_package_usd?: number;
  price_per_piece_usd?: number;
  
  // Pricing & Codes
  selling_price_usd?: number;
  profit_margin_percent?: number;
  product_code?: string;
  category_prefix?: string;
  product_number?: number;
}

export * from './customer';
