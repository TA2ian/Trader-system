import { useState, useEffect } from "react";
import { InventoryItem } from "../types";
import { inventoryService } from "../services/inventoryService";
import { useAuth } from "../context/AuthContext";

export function useInventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getItems();
      const companyId = user?.company_id || "1";
      // Filter by active tenant company_id, including 'demo-company' if we are on default view
      const filtered = data.filter(i => i.company_id === companyId || (companyId === "1" && i.company_id === "demo-company"));
      setItems(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    
    const handleClear = () => {
      setItems([]);
      fetchItems();
    };
    
    window.addEventListener('app-data-cleared', handleClear);
    return () => window.removeEventListener('app-data-cleared', handleClear);
  }, [user?.company_id]);

  return { items, loading, refresh: fetchItems };
}
