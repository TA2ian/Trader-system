export interface Customer {
  id: string;
  company_id: string;
  name: string;
  region: string;
  address: string;
  phone: string;
  credit_limit: number;
  balance_usd: number;
  created_at?: string;
  updated_at?: string;
  last_transaction_date?: string;
}
