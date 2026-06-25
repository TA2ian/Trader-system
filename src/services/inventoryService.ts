import { db } from "../lib/firebase";
import { InventoryItem } from "../types";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

const inventoryCollection = collection(db, 'inventory');

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    try {
      const q = query(inventoryCollection, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
    } catch (e) {
      console.error("Firestore getItems error, using local fallback:", e);
      return this.getLocalItems();
    }
  },

  async addProduct(product: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'lastUpdated'>): Promise<InventoryItem> {
    try {
      const docRef = await addDoc(inventoryCollection, {
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      return { ...product, id: docRef.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), lastUpdated: new Date().toISOString() } as InventoryItem;
    } catch (e) {
      console.error("Firestore addProduct error, using local fallback:", e);
      const newItem: InventoryItem = {
        ...product,
        id: Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      this.saveLocalItem(newItem);
      return newItem;
    }
  },

  async updateProduct(id: string, product: Partial<InventoryItem>): Promise<void> {
    try {
      const productDoc = doc(db, 'inventory', id);
      await updateDoc(productDoc, { ...product, updated_at: new Date().toISOString(), lastUpdated: new Date().toISOString() });
    } catch (e) {
      console.error("Firestore updateProduct error, using local fallback:", e);
      this.updateLocalItem(id, product);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const productDoc = doc(db, 'inventory', id);
      await deleteDoc(productDoc);
    } catch (e) {
      console.error("Firestore deleteProduct error, using local fallback:", e);
      this.deleteLocalItem(id);
    }
  },

  updateLocalItem(id: string, product: Partial<InventoryItem>) {
    const current = this.getLocalItems();
    const updated = current.map(item => item.id === id ? { ...item, ...product, lastUpdated: new Date().toISOString() } : item);
    try {
      localStorage.setItem('local_inventory', JSON.stringify(updated));
    } catch (e) {}
  },

  deleteLocalItem(id: string) {
    const current = this.getLocalItems();
    const updated = current.filter(item => item.id !== id);
    try {
      localStorage.setItem('local_inventory', JSON.stringify(updated));
    } catch (e) {}
  },

  getLocalItems(): InventoryItem[] {
    try {
      const local = localStorage.getItem('local_inventory');
      if (local) {
        try {
          return JSON.parse(local);
        } catch (e) {
          // failed to parse
        }
      }
    } catch (e) {
      console.warn("localStorage not available", e);
    }
    const mocks = this.getMockItems();
    try {
      localStorage.setItem('local_inventory', JSON.stringify(mocks));
    } catch (e) {}
    return mocks;
  },

  saveLocalItem(item: InventoryItem) {
    const current = this.getLocalItems();
    const updated = [...current, item];
    try {
      localStorage.setItem('local_inventory', JSON.stringify(updated));
    } catch (e) {}
  },

  setAllLocalItems(items: InventoryItem[]) {
    try {
      localStorage.setItem('local_inventory', JSON.stringify(items));
    } catch (e) {}
  },

  getMockItems(): InventoryItem[] {
    return [
      {
        id: "1",
        company_id: "demo-company",
        name: "سكر أبيض (50 كغ)",
        quantity: 120,
        unitPriceUSD: 25, // 25$
        lastUpdated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit_type: "piece",
        category: "سلع استهلاكية"
      },
      {
        id: "2",
        company_id: "demo-company",
        name: "زيت صويا (16 ليتر)",
        quantity: 45,
        unitPriceUSD: 18, // 18$
        lastUpdated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit_type: "piece",
        category: "سلع استهلاكية"
      },
      {
        id: "3",
        company_id: "demo-company",
        name: "رز هندي (10 كغ)",
        quantity: 80,
        unitPriceUSD: 12, // 12$
        lastUpdated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit_type: "piece",
        category: "سلع استهلاكية"
      }
    ];
  },

  async clearAll(): Promise<void> {
    // Firestore deletion for all is more complex, skipping for now
  }
};

