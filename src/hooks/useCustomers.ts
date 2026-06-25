import { useState, useEffect } from "react";
import { Customer } from "../types";
import { customerService } from "../services/customerService";
import { useAuth } from "../context/AuthContext";

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      const companyId = user?.company_id || "1";
      // Filter by active tenant company_id, including 'demo-company' if we are on default view
      const filtered = data.filter(c => c.company_id === companyId || (companyId === "1" && c.company_id === "demo-company"));
      setCustomers(filtered);
    } catch (err: any) {
      setError(err.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    
    const handleClear = () => {
      setCustomers([]);
      fetchCustomers();
    };
    
    window.addEventListener('app-data-cleared', handleClear);
    return () => window.removeEventListener('app-data-cleared', handleClear);
  }, [user?.company_id]);

  const addCustomer = async (customerData: Omit<Customer, "id" | "created_at" | "updated_at">) => {
    try {
      const companyId = user?.company_id || "1";
      const newCustomer = await customerService.addCustomer({
        ...customerData,
        company_id: companyId
      });
      setCustomers(prev => [...prev, newCustomer]);
      return newCustomer;
    } catch (err: any) {
      setError(err.message || "Failed to add customer");
    }
  };

  const editCustomer = async (id: string, updatedData: Partial<Customer>) => {
    try {
      await customerService.updateCustomer(id, updatedData);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } : c));
    } catch (err: any) {
      setError(err.message || "Failed to update customer");
    }
  };

  const removeCustomer = async (id: string) => {
    try {
      await customerService.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete customer");
    }
  };

  return { customers, loading, error, refresh: fetchCustomers, addCustomer, editCustomer, removeCustomer };
}
