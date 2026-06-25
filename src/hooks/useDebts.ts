import { useState, useEffect } from "react";
import { Debt } from "../types";
import { debtService } from "../services/debtService";
import { useAuth } from "../context/AuthContext";

export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const data = await debtService.getDebts();
      const companyId = user?.company_id || "1";
      // Filter by active tenant company_id, including 'demo-company' if we are on default view
      const filtered = data.filter(d => d.company_id === companyId || (companyId === "1" && d.company_id === "demo-company"));
      setDebts(filtered);
    } catch (err: any) {
      setError(err.message || "Failed to fetch debts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
    
    const handleClear = () => {
      setDebts([]);
      fetchDebts();
    };
    
    window.addEventListener('app-data-cleared', handleClear);
    return () => window.removeEventListener('app-data-cleared', handleClear);
  }, [user?.company_id]);

  const addDebt = async (debtData: Omit<Debt, "id" | "created_at" | "updated_at">) => {
    try {
      const companyId = user?.company_id || "1";
      const newDebt = await debtService.addDebt({
        ...debtData,
        company_id: companyId
      });
      setDebts(prev => [newDebt as Debt, ...prev]);
      return newDebt;
    } catch (err: any) {
      setError(err.message || "Failed to add debt");
    }
  };

  return { debts, loading, error, refresh: fetchDebts, addDebt };
}
